'use server';

import { redirect } from 'next/navigation';

import * as z from 'zod';

import { env } from '@/env';
import { DEPOSIT_AMOUNT, MAX_PERSONS, MAX_PETS } from '@/lib/constants';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

const CheckoutSchema = z.object({
  numberOfGuests: z.coerce.number().int().min(1).max(MAX_PERSONS),
  numberOfPets: z.coerce.number().int().min(0).max(MAX_PETS),
  clientNote: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v === '' ? null : v)),
});

export type CheckoutFormState = { error?: string } | undefined;

export async function createCheckoutSession(
  bookingIntentId: string,
  _prevState: CheckoutFormState,
  formData: FormData,
) {
  const parsed = CheckoutSchema.safeParse({
    numberOfGuests: formData.get('numberOfGuests'),
    numberOfPets: formData.get('numberOfPets'),
    clientNote: formData.get('clientNote'),
  });

  if (!parsed.success) {
    return { error: 'Add meg, hányan jöttök (legalább 1 fő).' };
  }

  const { numberOfGuests, numberOfPets, clientNote } = parsed.data;

  const bookingIntent = await prisma.bookingIntent.findUnique({
    where: { id: bookingIntentId },
    include: {
      timeSlot: {
        select: { revealed: true, photoShooting: { select: { id: true } } },
      },
    },
  });

  if (bookingIntent == null || bookingIntent.expiresAt <= new Date()) {
    return {
      error: 'Ez a foglalás már lejárt. Kezdd újra a foglalást a főoldalról.',
    };
  }

  if (
    bookingIntent.timeSlot.revealed === false ||
    bookingIntent.timeSlot.photoShooting != null
  ) {
    return {
      error: 'Ez az időpont már nem elérhető. Kérlek, válassz másikat.',
    };
  }

  await prisma.bookingIntent.update({
    where: { id: bookingIntentId },
    data: { numberOfGuests, numberOfPets, clientNote },
  });

  let sessionUrl: string | null;
  try {
    const { data: stripeCustomers } = await stripe.customers.search({
      query: `email:"${bookingIntent.email}"`,
      limit: 1,
    });

    const stripeCustomer =
      stripeCustomers[0] ??
      (await stripe.customers.create({
        email: bookingIntent.email,
        name: bookingIntent.name,
      }));

    const origin = env.NEXT_PUBLIC_SITE_URL;
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomer.id,
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'huf',
            product_data: { name: 'Fotózás előleg' },
            unit_amount: DEPOSIT_AMOUNT,
          },
          quantity: 1,
        },
      ],
      billing_address_collection: 'required',
      customer_update: { address: 'auto' },
      phone_number_collection: { enabled: true },
      metadata: { booking_intent_id: bookingIntent.id },
      success_url: `${origin}/success`,
      cancel_url: `${origin}/foglalas-veglegesitese/${bookingIntentId}`,
    });
    sessionUrl = session.url;
  } catch {
    return {
      error:
        'Nem sikerült kapcsolódni a fizetési szolgáltatóhoz, próbáld újra.',
    };
  }

  if (sessionUrl == null) {
    return { error: 'Nem tudtuk létrehozni a fizetést, próbáld újra.' };
  }

  redirect(sessionUrl);
}
