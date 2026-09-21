'use server';

import { revalidatePath } from 'next/cache';

import * as z from 'zod';

import { PhotoShooting, PhotoShootingStatus } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';

export async function fetchPhotographers() {
  return prisma.staffProfile.findMany({
    where: { isPhotographer: true },
    select: { id: true, owner: { select: { name: true } } },
  });
}

export async function fetchEditors() {
  return prisma.staffProfile.findMany({
    where: { isEditor: true },
    select: { id: true, owner: { select: { name: true } } },
  });
}

const PhotoShootingUpdateSchema = z.object({
  photographerId: z.uuid().nullable().optional(),
  editorId: z.uuid().nullable().optional(),
  rawImagesUrl: z.url().nullable().optional(),
  finalImagesUrl: z.url().nullable().optional(),
});

type PhotoShootingUpdateInput = z.infer<typeof PhotoShootingUpdateSchema>;

function resolveStatus(
  current: PhotoShooting,
  updates: PhotoShootingUpdateInput,
): PhotoShootingStatus {
  const merged = { ...current, ...updates };

  if (merged.status === 'CLOSED') {
    return PhotoShootingStatus.CLOSED;
  }

  if (merged.photographerId == null) {
    return PhotoShootingStatus.PHOTOGRAPHER_SELECTION;
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
    });

    const status = resolveStatus(current, parsed.data);

    await prisma.photoShooting.update({
      where: { id },
      data: { ...parsed.data, status },
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
