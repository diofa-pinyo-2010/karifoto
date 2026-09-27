'use server';

import { revalidatePath } from 'next/cache';

import { verifySession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';
import { hufToCents } from '@/lib/utils';

export async function createBookingIntentDiscount({
  bookingIntentId,
  amountHuf,
  internalNote,
  publicLabel,
}: {
  bookingIntentId: string;
  amountHuf: number;
  internalNote: string;
  publicLabel: string;
}): Promise<{ id: string } | { error: string }> {
  const { staffProfile } = await verifySession();

  // If you want to make it available to Superadmins only
  // if (staffProfile.role !== 'SUPERADMIN') {
  //   return { error: 'Nincs jogosultságod ehhez.' };
  // }

  if (!Number.isInteger(amountHuf) || amountHuf <= 0) {
    return { error: 'Add meg az összeget forintban.' };
  }
  if (publicLabel.trim().length < 2 || internalNote.trim().length < 2) {
    return { error: 'Add meg a kedvezmény publikus nevét és indoklását.' };
  }

  try {
    const adjustment = await prisma.priceAdjustment.create({
      data: {
        type: 'DISCOUNT',
        amountInCents: hufToCents(amountHuf),
        publicLabel: publicLabel.trim(),
        internalNote: internalNote.trim(),
        bookingIntentId,
        createdById: staffProfile.id,
      },
      select: { id: true },
    });
    revalidatePath(`/admin/summary/${bookingIntentId}`);
    return { id: adjustment.id };
  } catch (error) {
    console.error(error);
    return { error: 'Nem sikerült létrehozni a kedvezményt. Próbáld újra.' };
  }
}

export async function deletePriceAdjustment({
  id,
  bookingIntentId,
  photoShootingId,
}: {
  id: string;
  bookingIntentId?: string;
  photoShootingId?: string;
}): Promise<{ error: string } | void> {
  await verifySession();

  try {
    await prisma.priceAdjustment.delete({ where: { id } });
  } catch (error) {
    console.error(error);
    return { error: 'Nem sikerült törölni a kedvezményt. Próbáld újra.' };
  }

  if (bookingIntentId) revalidatePath(`/admin/summary/${bookingIntentId}`);
  if (photoShootingId) revalidatePath(`/admin/summary/${photoShootingId}`);
}
