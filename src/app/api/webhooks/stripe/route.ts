import { NextRequest, NextResponse } from 'next/server';

import Stripe from 'stripe';

import { env } from '@/env';
import { Prisma } from '@/generated/prisma/client';
import {
  BookingIntentStatus,
  LedgerEntryCategory,
} from '@/generated/prisma/enums';
import { parseCheckoutMetadata } from '@/lib/checkout-metadata';
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
import { getBookingIntent } from '@/lib/queries';
import { stripe, stripePaymentIntentUrl } from '@/lib/stripe';
import { qStashClient } from '@/lib/upstash';

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
    case 'booking_deposit': {
      await handleBookingDeposit(session, metadata.booking_intent_id);
      return;
    }
    default: {
      // The exhaustiveness guard asserts on the *discriminant*, not on
      // `metadata` itself: TypeScript only narrows a parent object to `never`
      // when its type is a genuine union, and today `CheckoutMetadata` has a
      // single member. Narrowing the literal works either way — add a kind
      // without a case above and this assignment stops compiling.
      const unhandledKind: never = metadata.kind;
      throw new Error(
        `Unhandled checkout session kind: ${String(unhandledKind)}`,
      );
    }
  }
}

async function handleBookingDeposit(
  session: Stripe.Checkout.Session,
  bookingIntentId: string,
) {
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

  const shooting =
    existingShooting ??
    (await prisma.$transaction(async (tx) => {
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
    }));

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
      const category = LedgerEntryCategory.INCOME_CLIENT_PAYMENT_DEPOSIT;
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

  // Only for a freshly created shooting — a webhook retry finds it existing.
  if (existingShooting == null) {
    await sendDiscordNotification({
      type: 'info',
      content: [
        '🎉 **Új foglalás érkezett!**\n',
        `Név: ${bookingIntent.name}`,
        `Csomag: ${PACKAGE_LABEL[selectedPackage]}`,
        `Időpont: ${formatSlotDateTime(shooting.timeSlot.startTime)}`,
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
            url: `${env.NEXT_PUBLIC_SITE_URL}/api/jobs/generate-deposit-invoice`,
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
