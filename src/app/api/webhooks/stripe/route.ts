import { NextRequest, NextResponse } from 'next/server';

import Stripe from 'stripe';

import { env } from '@/env';
import { formatLongDate } from '@/lib/formatters';
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

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      await handleCheckoutCompleted(session);
    }
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log({ session });
  const userEmail = session.customer_details?.email;
  const userFullName = session.customer_details?.name;
  const userPhoneNumber = session.customer_details?.phone;
  const zip = session.customer_details?.address?.postal_code;
  const city = session.customer_details?.address?.city;
  const addressLine1 = session.customer_details?.address?.line1;
  const bookingIntentId = session.metadata?.booking_intent_id;

  if (bookingIntentId == null) {
    throw new Error(
      'Cannot find booking intent ID in checkout session metadata.',
    );
  }

  const bookingIntent = await getBookingIntent(bookingIntentId);

  if (bookingIntent == null) {
    throw new Error(
      'Cannot find booking intent after checkout session completed',
    );
  }

  const timeSlotId = bookingIntent.timeSlotId;
  const clientNote = bookingIntent.clientNote;
  const selectedPackage = bookingIntent.package;

  const paymentIntent =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? '');

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 10,
  });

  // Create or Update client (customer) in the database
  if (userEmail == null || userFullName == null || userPhoneNumber == null) {
    throw new Error(
      'Email, name or phone number is missing, cannot save new client',
    );
  }

  const lastName = userFullName.split(' ')[0];
  const firstName = userFullName.split(' ')[1];

  const stripeCustomerId =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer!.id!;

  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: { firstName, lastName, phoneNumber: userPhoneNumber },
    create: {
      email: userEmail,
      firstName,
      lastName,
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

  // PhotoShooting was created, delete BookingIntent
  try {
    await prisma.bookingIntent.delete({ where: { id: bookingIntentId } });
  } catch (err) {
    console.error('Could not delete Bookint Intent', err);
  }

  // Notify user (Resend)
  const startTime = shooting.timeSlot.startTime;
  if (startTime == null) {
    // TODO: Should we return here?
    return;
  }
  const bookedTimeString = formatLongDate(startTime);
  const resendRes = await sendBookingConfirmationEmail({
    to: userEmail,
    name: firstName,
    bookedTimeString,
  });
  console.log({ resendRes });

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

    try {
      const invoice = await prisma.invoice.create({
        data: {
          status: 'SETTLED',
          invoiceNumber,
          amountInCents: session.amount_total ?? 0,
          paymentMethod: 'CARD',
          publicUrl,
          photoShooting: { connect: { id: shooting.id } },
        },
      });

      // Insert Payment into db (idempotent: skip if already recorded for this shooting)
      const existingPayment = await prisma.payment.findFirst({
        where: { photoShootingId: shooting.id, paymentIntent },
      });

      if (existingPayment == null) {
        await prisma.payment.create({
          data: {
            amountInCents: session.amount_total ?? 0,
            method: 'CARD',
            paymentIntent,
            type: 'DEPOSIT',
            photoShooting: { connect: { id: shooting.id } },
            invoice: { connect: { id: invoice.id } },
          },
        });
      }
    } catch (error) {
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
    // TODO: Create Google Calendar entry
  } catch (error) {
    console.error('[stripe-webhook] invoice/payment creation failed', {
      shootingId: shooting.id,
      paymentIntent,
      error,
    });
  }
}
