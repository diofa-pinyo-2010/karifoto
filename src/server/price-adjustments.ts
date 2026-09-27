'use server';

import { revalidatePath } from 'next/cache';

import { verifySession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';
import { hufToCents } from '@/lib/utils';

export async function createBookingIntentDiscount(
  bookingIntentId: string,
  amountHuf: number,
  reason: string,
): Promise<{ id: string } | { error: string }> {
  const { staffProfile } = await verifySession();

  // If you want to make it available to Superadmins only
  // if (staffProfile.role !== 'SUPERADMIN') {
  //   return { error: 'Nincs jogosultságod ehhez.' };
  // }

  const trimmedReason = reason.trim();

  if (!Number.isInteger(amountHuf) || amountHuf <= 0) {
    return { error: 'Add meg az összeget forintban.' };
  }
  if (trimmedReason.length < 2) {
    return { error: 'Add meg a kedvezmény indoklását.' };
  }

  try {
    const adjustment = await prisma.priceAdjustment.create({
      data: {
        type: 'DISCOUNT',
        amountInCents: hufToCents(amountHuf),
        reason: trimmedReason,
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

export async function deletePriceAdjustment(
  id: string,
  bookingIntentId: string,
): Promise<{ error: string } | void> {
  await verifySession();

  try {
    await prisma.priceAdjustment.delete({ where: { id } });
  } catch (error) {
    console.error(error);
    return { error: 'Nem sikerült törölni a kedvezményt. Próbáld újra.' };
  }

  revalidatePath(`/admin/summary/${bookingIntentId}`);
}
