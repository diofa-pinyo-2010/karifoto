'use server';

import { DecorSet, Package, Prisma } from '@/generated/prisma/client';
import { BOOKING_INTENT_TTL_MINUTES } from '@/lib/constants';
import { DecorSetKey, PackageKey } from '@/lib/data';
import { prisma } from '@/lib/prisma';

const PACKAGE_KEY_TO_ENUM: Record<PackageKey, Package> = {
  mini: Package.MINI,
  classic: Package.CLASSIC,
  family: Package.FAMILY,
};

const DECOR_SET_KEY_TO_ENUM: Record<DecorSetKey, DecorSet> = {
  hofeher: DecorSet.HOFEHER,
  alomkastely: DecorSet.ALOMKASTELY,
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CreateBookingIntentInput = {
  timeSlotId: string;
  name: string;
  email: string;
  packageKey: PackageKey;
  decorSetKey: DecorSetKey | null;
  isLightPlaySelected: boolean;
};

export async function createBookingIntent(
  input: CreateBookingIntentInput,
): Promise<{ id: string } | { error: string }> {
  const name = input.name.trim();
  const email = input.email.trim();

  if (!input.timeSlotId || !UUID_RE.test(input.timeSlotId)) {
    return { error: 'Érvénytelen idősáv.' };
  }
  if (name.length < 2) {
    return { error: 'Add meg a teljes neved.' };
  }
  if (!email.includes('@')) {
    return { error: 'Add meg érvényes e-mail címed.' };
  }

  const bothDecorSets = input.packageKey !== 'mini';
  if (!bothDecorSets && !input.decorSetKey) {
    return { error: 'Válassz díszletet!.' };
  }
  const expiresAt = new Date(
    Date.now() + BOOKING_INTENT_TTL_MINUTES * 60 * 1000,
  );

  try {
    const intent = await prisma.bookingIntent.create({
      data: {
        name,
        email,
        package: PACKAGE_KEY_TO_ENUM[input.packageKey],
        decorSet:
          bothDecorSets || !input.decorSetKey
            ? null
            : DECOR_SET_KEY_TO_ENUM[input.decorSetKey],
        isLightPlaySelected: input.isLightPlaySelected,
        expiresAt,
        timeSlotId: input.timeSlotId,
      },
      select: { id: true },
    });
    return { id: intent.id };
  } catch {
    return { error: 'Nem sikerült létrehozni a foglalást. Próbáld újra.' };
  }
}

const bookingIntentWithTimeSlot = {
  include: {
    timeSlot: { select: { startTime: true } },
  },
} satisfies Prisma.BookingIntentDefaultArgs;

export type BookingIntentWithTimeSlot = Prisma.BookingIntentGetPayload<
  typeof bookingIntentWithTimeSlot
>;

export async function getBookingIntent(id: string) {
  if (!UUID_RE.test(id)) return null;
  return prisma.bookingIntent.findUnique({
    where: { id },
    ...bookingIntentWithTimeSlot,
  });
}
