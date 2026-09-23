import { NextRequest, NextResponse } from 'next/server';

import Stripe from 'stripe';

import { env } from '@/env';
import { BookingIntentStatus } from '@/generated/prisma/enums';
import {
  EXTRA_EDIT_PER_IMAGE,
  EXTRA_FEE_PER_EXTRA_PERSON,
  EXTRA_FEE_PER_PET,
  EXTRA_RETOUCH_PER_IMAGE,
  LIGHT_PLAY_FEE,
  PACKAGE_PRICES,
  PERSONS_INCLUDED,
} from '@/lib/constants';
import { sendDiscordNotification } from '@/lib/discord';
import { isEventProcessed, releaseEvent } from '@/lib/idempotency';
import { prisma } from '@/lib/prisma';
import { stripe, stripePaymentIntentUrl } from '@/lib/stripe';
import { qStashClient } from '@/lib/upstash';
import { getBookingIntent } from '@/server/booking-intent';

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
        await handleCheckoutCompleted(session);
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

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userEmail = session.customer_details?.email;
  const invoicingName = session.customer_details?.name;
  const userPhoneNumber = session.customer_details?.phone;
  const zip = session.customer_details?.address?.postal_code;
  const city = session.customer_details?.address?.city;
  const addressLine1 = session.customer_details?.address?.line1;
  const bookingIntentId = session.metadata?.booking_intent_id;

  const paymentIntent =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? '');

  if (bookingIntentId == null) {
    console.error('[stripe-webhook] no booking_intent_id in session metadata', {
      sessionId: session.id,
      paymentIntent,
      email: userEmail,
      amount: session.amount_total,
    });
    return;
  }

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
        '**Nem kaptunk customer adatokat a Stripe-tól!**',
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
        '**Nem találjuk a Booking Intent-et a DB-ben**',
        `Booking intent ID: ${bookingIntentId}`,
        `Checkout Session ID: ${session.id}`,
        `Payment Intent: ${paymentIntent}`,
        `User email: ${userEmail}`,
      ].join('\n'),
    });
    return;
  }

  const timeSlotId = bookingIntent.timeSlotId;
  const clientNote = bookingIntent.clientNote;
  const selectedPackage = bookingIntent.package;

  const stripeCustomerId =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer!.id!;

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
    update: { stripeCustomerId },
    create: { userId: user.id, stripeCustomerId },
  });

  // Best-effort — used for invoicing (via bookingIntent) and analytics (via
  // clientProfile), neither of which should block the booking itself.
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
          '**Nem sikerült elmenteni a számlázási címet**',
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
        '**Hiányzó számlázási cím adatok a Stripe-tól**',
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
        '**Ugyanaz az idősáv duplán lett eladva!**',
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
      const newPhotoShooting = await tx.photoShooting.create({
        data: {
          client: { connect: { id: client.id } },
          timeSlot: { connect: { id: timeSlotId } },
          package: selectedPackage,
          clientNote,
          decorSet: bookingIntent.decorSet,
          numberOfGuests: bookingIntent.numberOfGuests,
          numberOfPets: bookingIntent.numberOfPets,
          isLightPlaySelected: bookingIntent.isLightPlaySelected,
        },
        include: { timeSlot: { select: { startTime: true } } },
      });
      // Create a snapshot about the current prices (like if it was an order)
      await tx.photoShootingPricing.create({
        data: {
          photoShootingId: newPhotoShooting.id,
          packagePriceInCents: PACKAGE_PRICES[selectedPackage].base,
          packageStudioPriceInCents: PACKAGE_PRICES[selectedPackage].studio,
          lightPlayPriceInCents: LIGHT_PLAY_FEE,
          packageEditedImagesAllowance:
            PACKAGE_PRICES[selectedPackage].editedImagesAllowance,
          extraPeopleThreshold: PERSONS_INCLUDED,
          extraPeopleRateInCents: EXTRA_FEE_PER_EXTRA_PERSON,
          extraPetRateInCents: EXTRA_FEE_PER_PET,
          extraEditedImageRateInCents: EXTRA_EDIT_PER_IMAGE,
          extraRetouchedImageRateInCents: EXTRA_RETOUCH_PER_IMAGE,
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

  // Kártyás fizetésnél mindig van payment_intent; ha mégsem, a számlázó job üres
  // stringet írna a Payment.paymentIntent @unique mezőjébe, és a következő ilyen
  // foglalás ütközne vele. Inkább el sem indítjuk.
  const canInvoice = paymentIntent !== '';
  if (!canInvoice) {
    console.error('[stripe-webhook] no payment intent, skipping invoice job', {
      shootingId: shooting.id,
      bookingIntentId,
      sessionId: session.id,
    });
  }

  // Publish email sending and invoice generation, and Google Event Creation to QStash
  const [emailJob, invoiceJob] = await Promise.all([
    qStashClient.publishJSON({
      url: `${env.NEXT_PUBLIC_SITE_URL}/api/jobs/email-confirmation`,
      body: { shootingId: shooting.id },
      retries: 3,
    }),
    canInvoice
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
  ]);

  // TODO: Save the job ids to db?
  console.log('[stripe-webhook] jobs published', {
    shootingId: shooting.id,
    bookingIntentId,
    emailMessageId: emailJob.messageId,
    invoiceMessageId: invoiceJob?.messageId ?? null,
  });

  // TODO: Create Google Calendar entry
}
