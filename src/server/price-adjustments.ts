'use server';

import { revalidatePath } from 'next/cache';

import { PriceAdjustmentType } from '@/generated/prisma/client';
import { verifySession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';
import { hufToCents } from '@/lib/utils';
import { recalculatePhotoShootingStatus } from '@/server/admin';

// A PriceAdjustment belongs to exactly one of these
export type PriceAdjustmentTarget =
  | { bookingIntentId: string }
  | { photoShootingId: string };

// Photo shooting status depends on the remaining amount, so recalculating
// also revalidates the photo shooting page
async function refreshTarget(target: PriceAdjustmentTarget) {
  if ('bookingIntentId' in target) {
    revalidatePath(`/admin/summary/${target.bookingIntentId}`);
  } else {
    await recalculatePhotoShootingStatus(target.photoShootingId);
  }
}

export async function createPriceAdjustment({
  target,
  type,
  amountHuf,
  internalNote,
  publicLabel,
}: {
  target: PriceAdjustmentTarget;
  type: PriceAdjustmentType;
  amountHuf: number;
  internalNote: string;
  publicLabel: string;
}): Promise<{ id: string } | { error: string }> {
  const { staffProfile } = await verifySession();

  // If you want to make it available to Superadmins only
  // if (staffProfile.role !== 'SUPERADMIN') {
  //   return { error: 'Nincs jogosultságod ehhez.' };
  // }

  if (!Object.values(PriceAdjustmentType).includes(type)) {
    return { error: 'Érvénytelen típus.' };
  }
  if (!Number.isInteger(amountHuf) || amountHuf <= 0) {
    return { error: 'Add meg az összeget forintban.' };
  }
  if (publicLabel.trim().length < 2 || internalNote.trim().length < 2) {
    return { error: 'Add meg a tétel publikus nevét és indoklását.' };
  }

  try {
    const adjustment = await prisma.priceAdjustment.create({
      data: {
        type,
        amountInCents: hufToCents(amountHuf),
        publicLabel: publicLabel.trim(),
        internalNote: internalNote.trim(),
        bookingIntentId:
          'bookingIntentId' in target ? target.bookingIntentId : null,
        photoShootingId:
          'photoShootingId' in target ? target.photoShootingId : null,
        createdById: staffProfile.id,
      },
      select: { id: true },
    });
    await refreshTarget(target);
    return { id: adjustment.id };
  } catch (error) {
    console.error(error);
    return { error: 'Nem sikerült létrehozni a tételt. Próbáld újra.' };
  }
}

export async function deletePriceAdjustment({
  id,
  target,
}: {
  id: string;
  target: PriceAdjustmentTarget;
}): Promise<{ error: string } | void> {
  await verifySession();

  try {
    await prisma.priceAdjustment.delete({ where: { id } });
  } catch (error) {
    console.error(error);
    return { error: 'Nem sikerült törölni a tételt. Próbáld újra.' };
  }

  await refreshTarget(target);
}
