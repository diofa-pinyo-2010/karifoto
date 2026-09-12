import { NextRequest, NextResponse } from 'next/server';

import Stripe from 'stripe';

import { env } from '@/env';
import { Prisma } from '@/generated/prisma/client';
import { BookingIntentStatus } from '@/generated/prisma/enums';
import { formatLongDate } from '@/lib/formatters';
import { isEventProcessed, releaseEvent } from '@/lib/idempotency';
import { invoiceService } from '@/lib/invoice';
import { NamedVATRate } from '@/lib/invoice/types';
import { prisma } from '@/lib/prisma';
import { sendBookingConfirmationEmail } from '@/lib/resend/booking-confirmation';
import { stripe } from '@/lib/stripe';
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

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 10,
  });

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

  // Notify user (Resend)
  const startTime = shooting.timeSlot.startTime;
  const bookedTimeString = formatLongDate(startTime);
  try {
    const resendRes = await sendBookingConfirmationEmail({
      to: userEmail,
      name: userFullName,
      bookedTimeString,
    });
    console.log({ resendRes });
  } catch (error) {
    // The shooting is already booked — a failed email must not cost us the
    // invoice below, nor block the whole event from finishing.
    console.error('[stripe-webhook] could not send confirmation email', {
      shootingId: shooting.id,
      bookingIntentId,
      email: userEmail,
      error,
    });
  }

  // GenerateInvoice and save to db
  try {
    if (zip == null || addressLine1 == null || city == null) {
      throw new Error(
        '[Billing address]: Address is missing, cannot create invoice.',
      );
    }

    const { invoiceNumber, publicUrl } = await invoiceService.generateInvoice({
      customer: {
        name: userFullName,
        zip,
        city,
        addressLine1,
        email: userEmail,
      },
      items: lineItems.data.map((item) => {
        const quantity = item.quantity ?? 1;
        return {
          name: item.description ?? 'tétel',
          quantity,
          unitPriceGross: item.amount_total / 100,
          vatRate: NamedVATRate.AAM,
        };
      }),
      comment: paymentIntent,
    });

    // Invoice and Payment go in together: a half-written pair would leave an
    // Invoice row pointing at a real szamlazz document with nothing paid
    // against it. Payment.paymentIntent is unique, so a concurrent run that
    // already recorded this payment rolls the whole thing back.
    try {
      await prisma.$transaction(async (tx) => {
        const invoice = await tx.invoice.create({
          data: {
            status: 'SETTLED',
            invoiceNumber,
            amountInCents: session.amount_total ?? 0,
            paymentMethod: 'CARD',
            publicUrl,
            photoShooting: { connect: { id: shooting.id } },
          },
        });

        await tx.payment.create({
          data: {
            amountInCents: session.amount_total ?? 0,
            method: 'CARD',
            paymentIntent,
            type: 'DEPOSIT',
            photoShooting: { connect: { id: shooting.id } },
            invoice: { connect: { id: invoice.id } },
          },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        console.warn(
          '[stripe-webhook] payment already recorded, skipping duplicate',
          { shootingId: shooting.id, paymentIntent, invoiceNumber },
        );
      } else {
        console.error(
          '[stripe-webhook] invoice was issued at szamlazz.hu but failed to save',
          {
            shootingId: shooting.id,
            paymentIntent,
            invoiceNumber,
            error,
          },
        );
      }
    }
    // TODO: Create Google Calendar entry
  } catch (error) {
    console.error('[stripe-webhook] invoice/payment creation failed', {
      shootingId: shooting.id,
      paymentIntent,
      error,
    });
  }
}
