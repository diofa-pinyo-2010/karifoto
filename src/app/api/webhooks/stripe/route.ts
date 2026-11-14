import { NextRequest, NextResponse } from 'next/server';

import Stripe from 'stripe';

import { env } from '@/env';
import { Prisma } from '@/generated/prisma/client';
import { BookingIntentStatus } from '@/generated/prisma/enums';
import {
  CHECKOUT_KIND_LEDGER_CATEGORY,
  parseCheckoutMetadata,
} from '@/lib/checkout-metadata';
import {
  isLightPlayChargeable,
  LEDGER_ENTRY_CATEGORY_SIGN,
  PACKAGE_LABEL,
} from '@/lib/constants';
import { sendDiscordNotification } from '@/lib/discord';
import { formatSlotDateTime } from '@/lib/formatters';
import { isEventProcessed, releaseEvent } from '@/lib/idempotency';
import { buildPricingSnapshot } from '@/lib/pricing-snapshot';
import { prisma } from '@/lib/prisma';
import { isUniqueViolationOnField } from '@/lib/prisma-errors';
import { invalidatePublicTimeSlots } from '@/lib/public-time-slots';
import { getBookingIntent } from '@/lib/queries';
import { stripe, stripePaymentIntentUrl } from '@/lib/stripe';
import { generateGiftCode } from '@/lib/token';
import { qStashClient } from '@/lib/upstash';
import { formatMoney } from '@/lib/utils';
import { completeImageSelection } from '@/server/complete-image-selection';
import { calculatePricing } from '@/server/pricing';

import type { PhotoShooting } from '@/generated/prisma/client';
import type { CheckoutMetadata } from '@/lib/checkout-metadata';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (sig == null) {
    return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error('[stripe-webhook] invalid signature', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (await isEventProcessed(event.id)) {
    console.log('[stripe-webhook] duplicate delivery, skipping', {
      eventId: event.id,
      type: event.type,
    });
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await routeCheckoutSession(session);
      }
    }
  } catch (err) {
    // Drop the idempotency marker, otherwise our own key would turn away every
    // retry Stripe sends for an event that never finished processing.
    await releaseEvent(event.id);
    console.error('[stripe-webhook] handler failed, released for retry', {
      eventId: event.id,
      type: event.type,
      err,
    });
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function readPaymentIntentId(session: Stripe.Checkout.Session) {
  return typeof session.payment_intent === 'string'
    ? session.payment_intent
    : (session.payment_intent?.id ?? '');
}

/**
 * Sends a completed Checkout Session to the handler for its kind.
 *
 * Every session we create carries that kind in its metadata. One that does not
 * is a payment we cannot account for, so it is escalated rather than guessed
 * at — silently falling through to the deposit handler would create a booking
 * for someone who was paying for something else entirely.
 */
async function routeCheckoutSession(session: Stripe.Checkout.Session) {
  const parsed = parseCheckoutMetadata(session.metadata);
  const paymentIntent = readPaymentIntentId(session);

  if (!parsed.ok) {
    // A retry cannot fix an unrecognised kind, so this returns 200 and alerts
    // instead. The money has moved and nothing has recorded it — a human must.
    console.error('[stripe-webhook] unroutable checkout session', {
      sessionId: session.id,
      paymentIntent,
      amount: session.amount_total,
      reason: parsed.reason,
    });
    await sendDiscordNotification({
      type: 'error',
      content: [
        '**Beazonosíthatatlan Stripe fizetés érkezett!**\n',
        'A fizetés megtörtént, de nem tudjuk hova könyvelni — kézi rögzítés kell.',
        `Checkout Session ID: ${session.id}`,
        `Fizetés (Stripe): ${
          paymentIntent !== '' ? stripePaymentIntentUrl(paymentIntent) : '—'
        }`,
        `Összeg: ${session.amount_total}`,
        `Ok: ${parsed.reason}`,
      ].join('\n'),
    });
    return;
  }

  const metadata = parsed.metadata;

  switch (metadata.kind) {
    case 'booking_deposit':
    case 'booking_gift': {
      await handleBooking(session, metadata.booking_intent_id, metadata.kind);
      return;
    }
    case 'image_selection_extra': {
      await handleImageSelectionExtra(session, metadata);
      return;
    }
    default: {
      // Add a kind without a case above and this assignment stops compiling.
      const unhandled: never = metadata;
      throw new Error(
        `Unhandled checkout session kind: ${JSON.stringify(unhandled)}`,
      );
    }
  }
}

/**
 * The client paid for images over the allowance and/or beauty retouches. Ledger
 * first (money moved), then the same save the free "Beküldés" path runs, then
 * the invoice job.
 */
async function handleImageSelectionExtra(
  session: Stripe.Checkout.Session,
  metadata: Extract<CheckoutMetadata, { kind: 'image_selection_extra' }>,
) {
  const shootingId = metadata.photo_shooting_id;
  const paymentIntent = readPaymentIntentId(session);
  const amountTotal = session.amount_total ?? 0;

  // Card payments always have one; without it the @unique column would
  // collide, so treat it as a payment we cannot record — a human must.
  if (paymentIntent === '') {
    console.error('[stripe-webhook] extra payment without payment intent', {
      shootingId,
      sessionId: session.id,
    });
    await sendDiscordNotification({
      type: 'error',
      content: [
        '**Extra díj fizetés payment intent nélkül — kézi rögzítés kell!**\n',
        `Shooting ID: ${shootingId}`,
        `Checkout Session ID: ${session.id}`,
      ].join('\n'),
    });
    return;
  }

  try {
    const category = CHECKOUT_KIND_LEDGER_CATEGORY[metadata.kind];
    await prisma.ledgerEntry.create({
      data: {
        category,
        amountInCents: amountTotal * LEDGER_ENTRY_CATEGORY_SIGN[category],
        method: 'CARD',
        paymentIntent,
        photoShooting: { connect: { id: shootingId } },
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      console.warn(
        '[stripe-webhook] ledger entry already recorded (retry), skipping',
        { shootingId, paymentIntent },
      );
    } else {
      throw err;
    }
  }

  const completed = await completeImageSelection(shootingId, {
    editedImages: metadata.edited_images,
    retouchedImages: metadata.retouched_images,
    isExpressPostProduction: metadata.express_post_production === 'true',
    beautyRetouchNotes: metadata.beauty_retouch_notes ?? null,
  });
  if (!completed) {
    // Either a retry, or a second payment for an already closed selection
    // (two tabs). The ledger has it either way; the latter needs a refund.
    console.warn('[stripe-webhook] selection already completed', {
      shootingId,
      paymentIntent,
    });
  }

  await qStashClient.publishJSON({
    url: `${env.NEXT_PUBLIC_SITE_URL}/api/jobs/generate-extra-invoice`,
    body: { shootingId, sessionId: session.id, paymentIntent, amountTotal },
    retries: 5,
  });
}

// 32^8 lehetséges kód mellett már egy ütközés is valószínűtlen; a 3. után
// inkább dobunk (→ 500, a Stripe újrapróbálja), mint hogy a végtelenségig
// próbálkozzunk.
const GIFT_CODE_MAX_ATTEMPTS = 3;

/**
 * Runs `create` with a fresh gift code, again with a new one if the code was
 * already taken. Any other error — including a P2002 on another column, e.g.
 * a double-sold slot — is rethrown untouched.
 */
async function withGiftCodeRetry<T>(
  create: (giftCode: string) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await create(generateGiftCode());
    } catch (err) {
      const isGiftCodeCollision =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002' &&
        isUniqueViolationOnField(err.meta, 'giftCode');
      if (!isGiftCodeCollision || attempt >= GIFT_CODE_MAX_ATTEMPTS) {
        throw err;
      }
      console.warn('[stripe-webhook] gift code collision, retrying', {
        attempt,
      });
    }
  }
}

/**
 * A paid booking: the deposit, or the full amount up front when it is a gift.
 * The two share everything except the ledger category (derived from `kind`),
 * the gift code on the shooting and which invoice job runs.
 */
async function handleBooking(
  session: Stripe.Checkout.Session,
  bookingIntentId: string,
  kind: 'booking_deposit' | 'booking_gift',
) {
  const isGift = kind === 'booking_gift';

  const userEmail = session.customer_details?.email;
  const invoicingName = session.customer_details?.individual_name;
  const userPhoneNumber = session.customer_details?.phone;
  const zip = session.customer_details?.address?.postal_code;
  const city = session.customer_details?.address?.city;
  const addressLine1 = session.customer_details?.address?.line1;

  const paymentIntent = readPaymentIntentId(session);

  // Create or Update client (customer) in the database
  if (userEmail == null || invoicingName == null || userPhoneNumber == null) {
    console.error(
      '[stripe-webhook] missing customer details, cannot create client',
      {
        bookingIntentId,
        sessionId: session.id,
        paymentIntent,
        hasEmail: userEmail != null,
        hasName: invoicingName != null,
        hasPhone: userPhoneNumber != null,
      },
    );
    await sendDiscordNotification({
      type: 'error',
      content: [
        '**Nem kaptunk customer adatokat a Stripe-tól!**\n',
        `Booking intent ID: ${bookingIntentId}`,
        `Checkout Session ID: ${session.id}`,
        `Payment Intent: ${paymentIntent}`,
        `User email: ${userEmail}`,
        `User invoicing name: ${invoicingName}`,
        `User phone number: ${userPhoneNumber}`,
      ].join('\n'),
    });
    return;
  }

  const bookingIntent = await getBookingIntent(bookingIntentId);

  if (bookingIntent == null) {
    console.error('[stripe-webhook] booking intent not found', {
      bookingIntentId,
      sessionId: session.id,
      paymentIntent,
      email: userEmail,
      amount: session.amount_total,
    });
    await sendDiscordNotification({
      type: 'error',
      content: [
        '**Nem találjuk a Booking Intent-et a DB-ben**\n',
        `Booking intent ID: ${bookingIntentId}`,
        `Checkout Session ID: ${session.id}`,
        `Payment Intent: ${paymentIntent}`,
        `User email: ${userEmail}`,
      ].join('\n'),
    });
    return;
  }

  // The slot was deleted while this intent was pending, so there is nothing to
  // book the payment onto. Same handling as a double-sold slot: flag it and let
  // a human sort it out.
  if (bookingIntent.timeSlotId == null) {
    try {
      await prisma.bookingIntent.update({
        where: { id: bookingIntentId },
        data: { status: BookingIntentStatus.PAYMENT_ORPHANED, paymentIntent },
      });
    } catch (err) {
      console.error(
        'Could not update Booking Intent with orphaned payment.',
        err,
      );
    }
    console.error('[stripe-webhook] time slot is gone', {
      bookingIntentId,
      paymentIntent,
      email: userEmail,
    });
    await sendDiscordNotification({
      type: 'error',
      content: [
        '**A fizetett foglaláshoz tartozó idősáv már nem létezik**\n',
        `Booking intent ID: ${bookingIntentId}`,
        `Kért időpont: ${bookingIntent.requestedStartTime.toISOString()}`,
        `Fizetés (Stripe): ${
          paymentIntent !== ''
            ? `[${bookingIntent.name}](${stripePaymentIntentUrl(paymentIntent)})`
            : bookingIntent.name
        }`,
      ].join('\n'),
    });

    return; // 200 - no retry, no invoice, no email
  }

  const timeSlotId = bookingIntent.timeSlotId;
  const clientNote = bookingIntent.clientNote;
  const selectedPackage = bookingIntent.package;

  const stripeCustomerId =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer!.id!;

  const marketingConsentAt = bookingIntent.optOutFromMarketingEmails
    ? undefined
    : new Date();

  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: { phoneNumber: userPhoneNumber },
    create: {
      email: userEmail,
      name: bookingIntent.name,
      phoneNumber: userPhoneNumber,
    },
  });

  const client = await prisma.clientProfile.upsert({
    where: { userId: user.id },
    update: { stripeCustomerId, marketingConsentAt },
    create: { userId: user.id, stripeCustomerId, marketingConsentAt },
  });

  if (zip != null && city != null && addressLine1 != null) {
    try {
      await prisma.billingAddress.create({
        data: {
          name: invoicingName,
          zip,
          city,
          addressLine1,
          bookingIntent: { connect: { id: bookingIntentId } },
          clientProfile: { connect: { id: client.id } },
        },
      });
    } catch (err) {
      console.error('[stripe-webhook] could not save billing address', {
        bookingIntentId,
        clientId: client.id,
        err,
      });
      await sendDiscordNotification({
        type: 'warning',
        content: [
          '**Nem sikerült elmenteni a számlázási címet**\n',
          `Booking intent ID: ${bookingIntentId}`,
          `ClientProfile ID: ${client.id}`,
        ].join('\n'),
      });
    }
  } else {
    console.error('[stripe-webhook] missing billing address fields', {
      bookingIntentId,
      hasZip: zip != null,
      hasCity: city != null,
      hasAddressLine1: addressLine1 != null,
    });
    await sendDiscordNotification({
      type: 'warning',
      content: [
        '**Hiányzó számlázási cím adatok a Stripe-tól**\n',
        `Booking intent ID: ${bookingIntentId}`,
        `Van zip: ${zip != null}`,
        `Van város: ${city != null}`,
        `Van cím: ${addressLine1 != null}`,
      ].join('\n'),
    });
  }

  const existingShooting = await prisma.photoShooting.findUnique({
    where: { timeSlotId },
    include: {
      timeSlot: { select: { startTime: true } },
      client: { include: { owner: { select: { name: true } } } },
    },
  });

  if (existingShooting != null && existingShooting.clientId !== client.id) {
    try {
      await prisma.bookingIntent.update({
        where: { id: bookingIntentId },
        data: { status: BookingIntentStatus.PAYMENT_ORPHANED, paymentIntent },
      });
    } catch (err) {
      console.error(
        'Could not update Booking Intent with orphaned payment.',
        err,
      );
    }
    console.error('[stripe-webhook] slot double-sold!', {
      timeSlotId,
      bookingIntentId,
      paymentIntent,
      winner: existingShooting.clientId,
      loser: client.id,
    });

    // The winner's own payment isn't invoiced yet at this point (that job runs
    // async via QStash), so its ledger entry may not exist — link when we can.
    const winnerLedgerEntry = await prisma.ledgerEntry.findFirst({
      where: { photoShootingId: existingShooting.id },
      select: { paymentIntent: true },
    });
    const winnerName = existingShooting.client.owner.name;
    const winnerLabel =
      winnerLedgerEntry?.paymentIntent != null
        ? `[${winnerName}](${stripePaymentIntentUrl(winnerLedgerEntry.paymentIntent)})`
        : winnerName;
    const loserLabel =
      paymentIntent !== ''
        ? `[${bookingIntent.name}](${stripePaymentIntentUrl(paymentIntent)})`
        : bookingIntent.name;

    await sendDiscordNotification({
      type: 'error',
      content: [
        '**Ugyanaz az idősáv duplán lett eladva!**\n',
        `TimeSlot ID: ${timeSlotId}`,
        `Booking intent ID: ${bookingIntentId}`,
        `Sikeres foglalás (Stripe): ${winnerLabel}`,
        `Sikertelen foglalás (Stripe): ${loserLabel}`,
      ].join('\n'),
    });

    return; // 200 - no retry, no invoice, no email
  }

  const createShooting = (giftCode: string | null) =>
    prisma.$transaction(async (tx) => {
      const defaultEditor = await tx.staffProfile.findFirst({
        where: { isDefaultEditor: true },
        select: { id: true },
      });

      const newPhotoShooting = await tx.photoShooting.create({
        data: {
          client: { connect: { id: client.id } },
          timeSlot: { connect: { id: timeSlotId } },
          bookingIntent: { connect: { id: bookingIntentId } },
          package: selectedPackage,
          clientNote,
          giftCode,
          decorSet: bookingIntent.decorSet,
          numberOfGuests: bookingIntent.numberOfGuests,
          numberOfPets: bookingIntent.numberOfPets,
          isLightPlaySelected:
            isLightPlayChargeable(selectedPackage) &&
            bookingIntent.isLightPlaySelected,
          editor:
            defaultEditor != null
              ? { connect: { id: defaultEditor.id } }
              : undefined,
        },
        include: { timeSlot: { select: { startTime: true } } },
      });
      // Create a snapshot about the current prices (like if it was an order)
      await tx.photoShootingPricing.create({
        data: {
          photoShootingId: newPhotoShooting.id,
          ...buildPricingSnapshot(selectedPackage),
        },
      });
      await tx.timeSlot.update({
        where: { id: timeSlotId },
        data: { revealed: false },
      });
      return newPhotoShooting;
    });

  const shooting =
    existingShooting ??
    (isGift
      ? await withGiftCodeRetry(createShooting)
      : await createShooting(null));
  // Az idősáv foglalt lett — a főoldal ne mutassa tovább szabadnak.
  invalidatePublicTimeSlots();

  // PhotoShooting was created, convert the BookingIntent
  try {
    await prisma.$transaction(async (tx) => {
      await tx.bookingIntent.update({
        where: { id: bookingIntentId },
        data: { status: BookingIntentStatus.CONVERTED },
      });
      await tx.priceAdjustment.updateMany({
        where: { bookingIntentId },
        data: {
          bookingIntentId: null,
          photoShootingId: shooting.id,
        },
      });
    });
  } catch (err) {
    console.error('Could not convert Booking Intent', err);
  }

  // Kártyás fizetésnél mindig van payment_intent; ha mégsem, egy üres string
  // kerülne a LedgerEntry.paymentIntent @unique mezőjébe, és a következő ilyen
  // foglalás ütközne vele. Inkább sem a ledger bejegyzést, sem a számlázó jobot
  // nem indítjuk el.
  const hasPaymentIntent = paymentIntent !== '';
  if (!hasPaymentIntent) {
    console.error(
      '[stripe-webhook] no payment intent, skipping ledger entry and invoice job',
      { shootingId: shooting.id, bookingIntentId, sessionId: session.id },
    );
  } else {
    // Money has actually moved at this point — record it regardless of whether
    // invoicing (a 3rd-party call) succeeds. The invoice job
    // attaches the Invoice to this row later; it never creates the row itself.
    try {
      const category = CHECKOUT_KIND_LEDGER_CATEGORY[kind];
      await prisma.ledgerEntry.create({
        data: {
          category,
          amountInCents:
            (session.amount_total ?? 0) * LEDGER_ENTRY_CATEGORY_SIGN[category],
          method: 'CARD',
          paymentIntent,
          photoShooting: { connect: { id: shooting.id } },
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        console.warn(
          '[stripe-webhook] ledger entry already recorded (retry), skipping',
          { shootingId: shooting.id, paymentIntent },
        );
      } else {
        throw err;
      }
    }
  }

  // Ajándéknál a teljes összeget fizették: ha nem egyezik azzal, amit a
  // fotózásra számolunk, a pénz attól még be van könyvelve, de szólunk.
  // Csak friss fotózásnál — egy retry már létezőt talál.
  if (isGift && existingShooting == null) {
    await alertOnGiftAmountMismatch(session, shooting);
  }

  // Only for a freshly created shooting — a webhook retry finds it existing.
  if (existingShooting == null) {
    const note = bookingIntent.clientNote
      ? `"${bookingIntent.clientNote}"`
      : '-';
    await sendDiscordNotification({
      type: 'info',
      content: [
        '🎉 **Új foglalás érkezett!**\n',
        `Név: ${bookingIntent.name}`,
        `Csomag: ${PACKAGE_LABEL[selectedPackage]}`,
        `Időpont: ${formatSlotDateTime(shooting.timeSlot.startTime)}`,
        `Megjegyzés: ${note}`,
        ...(isGift ? ['🎁 Ajándék (teljes összeg)'] : []),
        `[Fotózás megnyitása az adminon](${env.NEXT_PUBLIC_SITE_URL}/admin/photo-shootings/${shooting.id})`,
      ].join('\n'),
    });
  }

  // Publish email sending and invoice generation, and Google Event Creation to QStash
  const [emailJob, invoiceJob, calendarEventJob, createResendContactJob] =
    await Promise.all([
      qStashClient.publishJSON({
        url: `${env.NEXT_PUBLIC_SITE_URL}/api/jobs/email-confirmation`,
        body: { shootingId: shooting.id },
        retries: 3,
      }),
      hasPaymentIntent
        ? qStashClient.publishJSON({
            url: `${env.NEXT_PUBLIC_SITE_URL}/api/jobs/${
              isGift
                ? 'generate-full-amount-invoice'
                : 'generate-deposit-invoice'
            }`,
            body: {
              shootingId: shooting.id,
              bookingIntentId,
              sessionId: session.id,
              paymentIntent,
              amountTotal: session.amount_total,
            },
            retries: 5,
          })
        : null,
      qStashClient.publishJSON({
        url: `${env.NEXT_PUBLIC_SITE_URL}/api/jobs/calendar-event`,
        body: { shootingId: shooting.id },
        retries: 3,
      }),
      marketingConsentAt != null
        ? qStashClient.publishJSON({
            url: `${env.NEXT_PUBLIC_SITE_URL}/api/jobs/create-resend-contact`,
            body: { email: userEmail },
            retries: 3,
          })
        : null,
    ]);

  // TODO: Save the job ids to db?
  console.log('[stripe-webhook] jobs published', {
    shootingId: shooting.id,
    bookingIntentId,
    emailMessageId: emailJob.messageId,
    invoiceMessageId: invoiceJob?.messageId ?? null,
    calendarMessageId: calendarEventJob.messageId,
    createResendContactMessageId: createResendContactJob?.messageId,
  });
}

/**
 * Compares what Stripe charged for a gift with the total the new shooting
 * computes to, once the intent's adjustments are reparented onto it. Only an
 * alert: the ledger already holds what was actually paid.
 */
async function alertOnGiftAmountMismatch(
  session: Stripe.Checkout.Session,
  shooting: PhotoShooting,
) {
  try {
    const [pricing, adjustments] = await Promise.all([
      prisma.photoShootingPricing.findUnique({
        where: { photoShootingId: shooting.id },
      }),
      prisma.priceAdjustment.findMany({
        where: { photoShootingId: shooting.id },
      }),
    ]);
    if (pricing == null) {
      throw new Error('Missing pricing snapshot');
    }

    const expected = calculatePricing({
      pricing,
      shooting,
      adjustments,
      ledgerEntries: [],
    }).totalToBePaid;
    const paid = session.amount_total ?? 0;
    if (paid === expected) {
      return;
    }

    console.error('[stripe-webhook] gift amount mismatch', {
      shootingId: shooting.id,
      sessionId: session.id,
      paid,
      expected,
    });
    await sendDiscordNotification({
      type: 'warning',
      content: [
        '**Ajándék fotózás: a fizetett összeg eltér a fotózás teljes árától!**\n',
        'A fizetést rögzítettük, de az egyenleget kézzel ellenőrizni kell.',
        `Fizetett (Stripe): ${formatMoney(paid)}`,
        `Fotózás teljes ára: ${formatMoney(expected)}`,
        `Shooting ID: ${shooting.id}`,
        `[Fotózás megnyitása az adminon](${env.NEXT_PUBLIC_SITE_URL}/admin/photo-shootings/${shooting.id})`,
      ].join('\n'),
    });
  } catch (err) {
    // Csak riasztás — emiatt nem buktatjuk el (és nem ismételtetjük) a webhookot.
    console.error('[stripe-webhook] could not check gift amount', {
      shootingId: shooting.id,
      err,
    });
  }
}
