'use server';

import { revalidatePath } from 'next/cache';

import * as z from 'zod';

import {
  DecorSet,
  LedgerEntry,
  Package,
  PhotoShootingPricing,
  PhotoShootingStatus,
  PriceAdjustment,
  Prisma,
} from '@/generated/prisma/client';
import { PACKAGE_PRICES, YES_NO_VALUES } from '@/lib/constants';
import { prisma } from '@/lib/prisma';
import { calculateRemainingAmount } from '@/server/pricing';

const photoShootingWithTimeSlotInclude = {
  include: {
    timeSlot: { select: { startTime: true } },
    pricing: true,
    adjustments: true,
    ledgerEntries: true,
  },
} satisfies Prisma.PhotoShootingDefaultArgs;

type PhotoShootingWithTimeSlot = Prisma.PhotoShootingGetPayload<
  typeof photoShootingWithTimeSlotInclude
>;

export async function fetchPhotographers() {
  return prisma.staffProfile.findMany({
    where: { isPhotographer: true },
    select: { id: true, nickname: true },
  });
}

export async function fetchEditors() {
  return prisma.staffProfile.findMany({
    where: { isEditor: true },
    select: { id: true, nickname: true },
  });
}

const PhotoShootingUpdateSchema = z.object({
  photographerId: z.uuid().nullable().optional(),
  editorId: z.uuid().nullable().optional(),
  rawImagesUrl: z.url().nullable().optional(),
  finalImagesUrl: z.url().nullable().optional(),
  numberOfGuests: z.coerce.number().optional(),
  numberOfPets: z.coerce.number().optional(),
  isLightPlaySelected: z
    .enum(YES_NO_VALUES)
    .transform((value) => value === 'IGEN')
    .optional(),
  package: z.enum(Object.values(Package) as [Package, ...Package[]]).optional(),
  decorSet: z
    .enum(Object.values(DecorSet) as [DecorSet, ...DecorSet[]])
    .nullable()
    .optional(),
});

type PhotoShootingUpdateInput = z.infer<typeof PhotoShootingUpdateSchema>;

function resolveStatus({
  current,
  updates,
  pricing,
  adjustments,
  ledgerEntries,
  now = new Date(),
}: {
  current: PhotoShootingWithTimeSlot;
  updates: PhotoShootingUpdateInput;
  pricing: PhotoShootingPricing;
  adjustments: PriceAdjustment[];
  ledgerEntries: LedgerEntry[];
  now?: Date;
}): PhotoShootingStatus {
  const merged = { ...current, ...updates };

  if (merged.closedAt != null) {
    return PhotoShootingStatus.CLOSED;
  }

  if (merged.photographerId == null) {
    return PhotoShootingStatus.PHOTOGRAPHER_SELECTION;
  }

  if (merged.timeSlot.startTime > now) {
    return PhotoShootingStatus.WAITING_FOR_THE_DATE;
  }

  if (merged.rawImagesUrl == null) {
    return PhotoShootingStatus.RAW_PHOTOS_UPLOAD;
  }

  if (merged.editorId == null) {
    return PhotoShootingStatus.EDITOR_SELECTION;
  }

  if (merged.finalImagesUrl == null) {
    return PhotoShootingStatus.FINAL_PHOTOS_UPLOAD;
  }

  const toBePaid = calculateRemainingAmount({
    pricing,
    shooting: merged,
    adjustments,
    ledgerEntries,
  });

  if (toBePaid > 0) {
    return PhotoShootingStatus.WAITING_FOR_PAYMENT;
  }

  return PhotoShootingStatus.COMPLETED;
}

export async function updatePhotoShooting(
  id: string,
  updates: PhotoShootingUpdateInput,
): Promise<{ error: string } | void> {
  const parsed = PhotoShootingUpdateSchema.safeParse(updates);
  if (!parsed.success) {
    return { error: 'Érvénytelen URL vagy adat.' };
  }

  try {
    const current = await prisma.photoShooting.findUniqueOrThrow({
      where: { id },
      ...photoShootingWithTimeSlotInclude,
    });

    if (current.pricing == null) {
      throw new Error(`PhotoShooting ${id} has no pricing record`);
    }

    await prisma.$transaction(async (tx) => {
      // TypeScript's narrowing doesn't carry over into
      // the async (tx) => {} callback, that's why the bang.
      let effectivePricing = current.pricing!;

      if (
        parsed.data.package != null &&
        parsed.data.package !== current.package
      ) {
        await tx.photoShootingPricing.update({
          where: { photoShootingId: id },
          data: {
            packagePriceInCents: PACKAGE_PRICES[parsed.data.package].base,
            packageStudioPriceInCents:
              PACKAGE_PRICES[parsed.data.package].studio,
            packageEditedImagesAllowance:
              PACKAGE_PRICES[parsed.data.package].editedImagesAllowance,
          },
        });

        effectivePricing = {
          ...current.pricing,
          packagePriceInCents: PACKAGE_PRICES[parsed.data.package].base,
          packageStudioPriceInCents: PACKAGE_PRICES[parsed.data.package].studio,
          packageEditedImagesAllowance:
            PACKAGE_PRICES[parsed.data.package].editedImagesAllowance,
        } as NonNullable<typeof current.pricing>;
      }

      const status = resolveStatus({
        current,
        updates: parsed.data,
        pricing: effectivePricing,
        adjustments: current.adjustments,
        ledgerEntries: current.ledgerEntries,
      });

      await tx.photoShooting.update({
        where: { id },
        data: { ...parsed.data, status },
      });
    });
  } catch (error) {
    console.error(error);
    return { error: 'Nem sikerült menteni a módosítást.' };
  }

  revalidatePath(`/admin/photo-shootings/${id}`);
}

export async function updatePhotoShootingField(
  shootingId: string,
  field: keyof PhotoShootingUpdateInput,
  value: string | null,
): Promise<{ error: string } | void> {
  return updatePhotoShooting(shootingId, { [field]: value });
}

export async function recalculatePhotoShootingStatus(
  shootingId: string,
): Promise<{ error: string } | void> {
  return updatePhotoShooting(shootingId, {});
}
