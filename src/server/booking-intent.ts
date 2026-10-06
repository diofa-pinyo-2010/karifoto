'use server';

import { DECOR_SETS, PACKAGES, requiresDecorChoice } from '@/lib/catalog';
import { EARLY_BIRD_DATE_DEADLINE, MAX_PETS, UUID_RE } from '@/lib/constants';
import { attachEarlyBirdDiscount } from '@/lib/price-adjustments';
import { prisma } from '@/lib/prisma';

import type { DecorSet, Package } from '@/generated/prisma/client';

export type CreateBookingIntentInput = {
  timeSlotId: string;
  name: string;
  email: string;
  packageKey: Package;
  decorSetKey: DecorSet | null;
  isLightPlaySelected: boolean;
  numberOfGuests: number;
  numberOfPets: number;
  clientNote: string | null;
  optOutFromMarketingEmails: boolean;
};

export async function createBookingIntent(
  input: CreateBookingIntentInput,
): Promise<{ id: string } | { error: string }> {
  const name = input.name.trim();
  const email = input.email.trim();

  if (!Object.hasOwn(PACKAGES, input.packageKey)) {
    return { error: 'Érvénytelen csomag.' };
  }

  if (
    input.decorSetKey != null &&
    !Object.hasOwn(DECOR_SETS, input.decorSetKey)
  ) {
    return { error: 'Érvénytelen díszlet.' };
  }

  if (!input.timeSlotId || !UUID_RE.test(input.timeSlotId)) {
    return { error: 'Érvénytelen idősáv.' };
  }
  if (name.length < 2) {
    return { error: 'Add meg a teljes neved.' };
  }
  if (!email.includes('@')) {
    return { error: 'Add meg érvényes e-mail címed.' };
  }

  const bothDecorSets = !requiresDecorChoice(input.packageKey);
  if (!bothDecorSets && !input.decorSetKey) {
    return { error: 'Válassz díszletet!.' };
  }

  if (
    !Number.isInteger(input.numberOfGuests) ||
    input.numberOfGuests < 1 ||
    input.numberOfGuests > PACKAGES[input.packageKey].maxGuests
  ) {
    return { error: 'Add meg, hányan jöttök (legalább 1 fő).' };
  }
  if (
    !Number.isInteger(input.numberOfPets) ||
    input.numberOfPets < 0 ||
    input.numberOfPets > MAX_PETS
  ) {
    return { error: 'Érvénytelen kisállat-szám.' };
  }

  // A form oldal betöltése óta elkelhetett az idősáv.
  const timeSlot = await prisma.timeSlot.findUnique({
    where: { id: input.timeSlotId },
    select: {
      startTime: true,
      revealed: true,
      photoShooting: { select: { id: true } },
    },
  });

  if (
    timeSlot == null ||
    timeSlot.photoShooting != null ||
    timeSlot.startTime.getTime() <= Date.now()
  ) {
    return { error: 'Ez az időpont már nem elérhető. Válassz másikat.' };
  }

  try {
    const intent = await prisma.bookingIntent.create({
      data: {
        name,
        email,
        package: input.packageKey,
        decorSet:
          bothDecorSets || !input.decorSetKey ? null : input.decorSetKey,
        isLightPlaySelected: input.isLightPlaySelected,
        numberOfGuests: input.numberOfGuests,
        numberOfPets: input.numberOfPets,
        clientNote: input.clientNote?.trim().slice(0, 500) || null,
        timeSlotId: input.timeSlotId,
        requestedStartTime: timeSlot.startTime,
        optOutFromMarketingEmails: input.optOutFromMarketingEmails,
      },
      select: { id: true, timeSlot: { select: { startTime: true } } },
    });

    try {
      if (intent.timeSlot?.startTime == null) {
        return {
          error: `Nem találtunk TimeSlot-ot a Booking Intenthez: ${intent.id}`,
        };
      }

      if (intent.timeSlot.startTime <= new Date(EARLY_BIRD_DATE_DEADLINE)) {
        const res = await attachEarlyBirdDiscount(intent.id);
        if ('error' in res) {
          console.error(res.error);
        }
      }
    } catch (err) {
      console.error('Early bird discount failed: ', err);
    }

    return { id: intent.id };
  } catch {
    return { error: 'Nem sikerült létrehozni a foglalást. Próbáld újra.' };
  }
}
