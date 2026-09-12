import { NextRequest, NextResponse } from 'next/server';

import Stripe from 'stripe';

import { env } from '@/env';
import { BookingIntentStatus } from '@/generated/prisma/enums';
import { isEventProcessed, releaseEvent } from '@/lib/idempotency';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
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
  const userFullName = session.customer_details?.name;
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
  if (userEmail == null || userFullName == null || userPhoneNumber == null) {
    console.error(
      '[stripe-webhook] missing customer details, cannot create client',
      {
        bookingIntentId,
        sessionId: session.id,
        paymentIntent,
        hasEmail: userEmail != null,
        hasName: userFullName != null,
        hasPhone: userPhoneNumber != null,
      },
    );
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
    update: { name: userFullName, phoneNumber: userPhoneNumber },
    create: {
      email: userEmail,
      name: userFullName,
      phoneNumber: userPhoneNumber,
    },
  });

  // TODO: Do we need a transaction here?
  // const [] = await prisma.$transaction(async (tx) => {})

  const client = await prisma.clientProfile.upsert({
    where: { userId: user.id },
    update: { stripeCustomerId },
    create: { userId: user.id, stripeCustomerId },
  });

  // Insert Photoshooting into db (idempotent: timeSlotId is unique)
  const existingShooting = await prisma.photoShooting.findUnique({
    where: { timeSlotId },
    include: { timeSlot: { select: { startTime: true } } },
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
        },
        include: { timeSlot: { select: { startTime: true } } },
      });
      await tx.timeSlot.update({
        where: { id: timeSlotId },
        data: { revealed: false },
      });
      return newPhotoShooting;
    }));

  // PhotoShooting was created, convert the BookingIntent
  try {
    await prisma.bookingIntent.update({
      where: { id: bookingIntentId },
      data: { status: BookingIntentStatus.CONVERTED },
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

  // Publish email sending and invoice generation to QStash
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
            zip,
            addressLine1,
            city,
            userFullName,
            sessionId: session.id,
            paymentIntent,
            amountTotal: session.amount_total,
          },
          retries: 5,
        })
      : null,
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
