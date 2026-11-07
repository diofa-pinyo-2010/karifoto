'use server';

import { revalidatePath } from 'next/cache';

import * as z from 'zod';

import { env } from '@/env';
import {
  DecorSet,
  Package,
  PhotoShootingStatus,
  Prisma,
} from '@/generated/prisma/client';
import {
  APP_URLS,
  isLightPlayChargeable,
  UUID_RE,
  YES_NO_VALUES,
} from '@/lib/constants';
import { verifySession } from '@/lib/dal';
import { buildPricingSnapshot } from '@/lib/pricing-snapshot';
import { prisma } from '@/lib/prisma';
import { qStashClient } from '@/lib/upstash';
import { resolveStatus } from '@/server/photo-shooting-status';
import { syncPhotoShootingStatus } from '@/server/sync-photo-shooting-status';

const photoShootingWithTimeSlotInclude = {
  include: {
    timeSlot: { select: { startTime: true } },
    pricing: true,
    adjustments: true,
    ledgerEntries: true,
  },
} satisfies Prisma.PhotoShootingDefaultArgs;

export async function fetchPhotographers() {
  await verifySession();

  return prisma.staffProfile.findMany({
    where: { isPhotographer: true },
    select: { id: true, nickname: true, owner: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

// A badge színek a sorrendből jönnek, ezért ennek stabilnak kell lennie, és
// szerepkör szerint sem szűrünk: így egy szerepkör-váltás nem keveri át a
// többiek színét.
export async function fetchStaffIdsForBadges() {
  await verifySession();

  const staff = await prisma.staffProfile.findMany({
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  return staff.map((member) => member.id);
}

export async function fetchEditors() {
  await verifySession();

  return prisma.staffProfile.findMany({
    where: { isEditor: true },
    select: {
      id: true,
      nickname: true,
      isDefaultEditor: true,
      owner: { select: { name: true } },
    },
  });
}

const SetDefaultEditorSchema = z.uuid().nullable();

export async function setDefaultEditor(
  staffProfileId: string | null,
): Promise<{ error: string } | void> {
  await verifySession();

  const parsed = SetDefaultEditorSchema.safeParse(staffProfileId);
  if (!parsed.success) {
    return { error: 'Érvénytelen adat.' };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.staffProfile.updateMany({
        where: { isDefaultEditor: true },
        data: { isDefaultEditor: false },
      });
      if (parsed.data != null) {
        await tx.staffProfile.update({
          where: { id: parsed.data },
          data: { isDefaultEditor: true },
        });
      }
    });
  } catch (error) {
    console.error(error);
    return { error: 'Nem sikerült menteni a módosítást.' };
  }
  revalidatePath('/admin/settings');
}

const PhotoShootingUpdateSchema = z.object({
  photographerId: z.uuid().nullable().optional(),
  editorId: z.uuid().nullable().optional(),
  rawImagesUrl: z.url().nullable().optional(),
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
  selectionRequestedAt: z.date().optional(),
  finalImagesUrl: z.url().nullable().optional(),
  completedAt: z.date().optional(),
  totalEditedImages: z.coerce.number().optional(),
  totalRetouchedImages: z.coerce.number().optional(),
});

type PhotoShootingUpdateInput = z.infer<typeof PhotoShootingUpdateSchema>;

export async function updatePhotoShooting(
  id: string,
  updates: PhotoShootingUpdateInput,
): Promise<{ error: string } | void> {
  await verifySession();

  if (!UUID_RE.test(id)) {
    return { error: 'Érvénytelen PhotoShooting ID.' };
  }

  const parsed = PhotoShootingUpdateSchema.safeParse(updates);
  if (!parsed.success) {
    return { error: 'Érvénytelen URL vagy adat.' };
  }

  let shouldSyncCalendar = false;

  try {
    const current = await prisma.photoShooting.findUniqueOrThrow({
      where: { id },
      ...photoShootingWithTimeSlotInclude,
    });

    if (current.status === PhotoShootingStatus.COMPLETED) {
      return { error: 'A lezárt fotózás nem módosítható.' };
    }

    const currentPricing = current.pricing;
    if (currentPricing == null) {
      throw new Error(`PhotoShooting ${id} has no pricing record`);
    }

    // A kiállított végszámla már az eddigi csomag árát tartalmazza, az utólagos
    // csomagcsere csak a számítást írná át, a számlát nem.
    if (
      parsed.data.package != null &&
      parsed.data.package !== current.package
    ) {
      const finalInvoice = await prisma.invoice.findFirst({
        where: { photoShootingId: id, type: 'FINAL' },
        select: { id: true },
      });
      if (finalInvoice != null) {
        return {
          error:
            'A végszámla már kiállításra került, a csomag nem módosítható.',
        };
      }
    }

    await prisma.$transaction(async (tx) => {
      let effectivePricing = currentPricing;
      let dataToSave = parsed.data;

      // Changing a package on the photoshooting
      if (
        parsed.data.package != null &&
        parsed.data.package !== current.package
      ) {
        const {
          packagePriceInCents,
          packageStudioPriceInCents,
          packageEditedImagesAllowance,
          photographerPackageFeeInCents,
        } = buildPricingSnapshot(parsed.data.package);

        effectivePricing = await tx.photoShootingPricing.update({
          where: { photoShootingId: id },
          data: {
            packagePriceInCents,
            packageStudioPriceInCents,
            packageEditedImagesAllowance,
            photographerPackageFeeInCents,
          },
        });

        // `isLightPlaySelected` csak akkor lehet igaz, ha a csomag felárat számol
        // érte (mint a webhooknál) — különben a mező IGEN-t mutatna felár nélkül,
        // és egy későbbi visszaváltásnál váratlanul visszajönne a felár.
        if (!isLightPlayChargeable(parsed.data.package)) {
          dataToSave = { ...dataToSave, isLightPlaySelected: false };
        }
      }

      const status = resolveStatus({
        current,
        updates: dataToSave,
        pricing: effectivePricing,
        adjustments: current.adjustments,
        ledgerEntries: current.ledgerEntries,
      });

      await tx.photoShooting.update({
        where: { id },
        data: { ...dataToSave, status },
      });

      // A naptáresemény címe, leírása és hossza a csomagtól és a fényjátéktól
      // függ.
      shouldSyncCalendar =
        (dataToSave.package != null &&
          dataToSave.package !== current.package) ||
        (dataToSave.isLightPlaySelected != null &&
          dataToSave.isLightPlaySelected !== current.isLightPlaySelected);
    });
  } catch (error) {
    console.error(error);
    return { error: 'Nem sikerült menteni a módosítást.' };
  }

  // A módosítás már mentve van, így a publikálási hibát csak naplózzuk.
  // Emailt nem küldünk, a kliens naptárlinkje nem frissül.
  if (shouldSyncCalendar) {
    try {
      await qStashClient.publishJSON({
        url: `${env.NEXT_PUBLIC_SITE_URL}/api/jobs/calendar-event-sync`,
        body: { shootingId: id },
        retries: 3,
      });
    } catch (error) {
      console.error('[updatePhotoShooting] failed to publish calendar sync', {
        shootingId: id,
        error,
      });
    }
  }

  revalidatePath(APP_URLS.photoShootingAdminPage(id));
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
  await verifySession();

  if (!UUID_RE.test(shootingId)) {
    return { error: 'Érvénytelen PhotoShooting ID.' };
  }

  try {
    await syncPhotoShootingStatus(shootingId);
  } catch (error) {
    console.error(error);
    return { error: 'Nem sikerült menteni a módosítást.' };
  }
}
