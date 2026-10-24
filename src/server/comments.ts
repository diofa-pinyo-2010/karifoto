'use server';

import { revalidatePath } from 'next/cache';

import * as z from 'zod';

import { APP_URLS, COMMENT_MAX_LENGTH, UUID_RE } from '@/lib/constants';
import { verifySession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';

export type CommentFormState = { error: string } | { ok: true } | undefined;

const CommentBodySchema = z
  .string()
  .trim()
  .min(1, 'Írj be valamit a megjegyzéshez.')
  .max(
    COMMENT_MAX_LENGTH,
    `A megjegyzés legfeljebb ${COMMENT_MAX_LENGTH} karakter lehet.`,
  );

export async function addPhotoShootingComment(
  photoShootingId: string,
  _prevState: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  const { staffProfile } = await verifySession();

  const raw = formData.get('body');
  const body = typeof raw === 'string' ? raw : '';

  if (!UUID_RE.test(photoShootingId)) {
    return { error: 'Érvénytelen PhotoShooting ID.' };
  }

  const parsed = CommentBodySchema.safeParse(body);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Érvénytelen megjegyzés.',
    };
  }

  const shooting = await prisma.photoShooting.findUnique({
    where: { id: photoShootingId },
    select: { id: true },
  });
  if (shooting == null) {
    return { error: 'Ez a fotózás nem található.' };
  }

  try {
    await prisma.comment.create({
      data: {
        body: parsed.data,
        authorId: staffProfile.id,
        photoShootingId,
      },
    });
  } catch (error) {
    console.error('[comments] failed to create photo shooting comment', {
      photoShootingId,
      error,
    });
    return { error: 'Nem sikerült menteni, próbáld újra.' };
  }

  revalidatePath(APP_URLS.photoShootingAdminPage(photoShootingId));
  return { ok: true };
}
