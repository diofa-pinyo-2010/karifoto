'use server';

import { revalidatePath } from 'next/cache';

import * as z from 'zod';

import { env } from '@/env';
import { APP_URLS, COMMENT_MAX_LENGTH, UUID_RE } from '@/lib/constants';
import { verifySession } from '@/lib/dal';
import { splitMentions } from '@/lib/mentions';
import { prisma } from '@/lib/prisma';
import { qStashClient } from '@/lib/upstash';

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

  const ids = new Set(
    splitMentions(parsed.data).flatMap((s) =>
      typeof s === 'string' ? [] : [s.id],
    ),
  );
  ids.delete(staffProfile.id);

  let mentionIds: string[];
  try {
    // A forged or deleted id is dropped here
    const recipientsToNotify = await prisma.staffProfile.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true },
    });
    const comment = await prisma.comment.create({
      data: {
        body: parsed.data,
        authorId: staffProfile.id,
        photoShootingId,
        mentions: {
          create: recipientsToNotify.map(({ id }) => ({ staffProfileId: id })),
        },
      },
      select: { mentions: { select: { id: true } } },
    });
    mentionIds = comment.mentions.map(({ id }) => id);
  } catch (error) {
    console.error('[comments] failed to create photo shooting comment', {
      photoShootingId,
      error,
    });
    return { error: 'Nem sikerült menteni, próbáld újra.' };
  }

  // The comment is already saved, so a publish failure is logged, not returned
  const results = await Promise.allSettled(
    mentionIds.map((commentMentionId) =>
      qStashClient.publishJSON({
        url: `${env.NEXT_PUBLIC_SITE_URL}/api/jobs/comment-mention`,
        body: { commentMentionId },
        retries: 3,
      }),
    ),
  );
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error('[comments] failed to publish comment-mention job', {
        commentMentionId: mentionIds[i],
        error: result.reason,
      });
    }
  });

  revalidatePath(APP_URLS.photoShootingAdminPage(photoShootingId));
  return { ok: true };
}
