import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import * as z from 'zod';

import { env } from '@/env';
import { APP_URLS } from '@/lib/constants';
import { formatLongDate } from '@/lib/formatters';
import { splitMentions } from '@/lib/mentions';
import { prisma } from '@/lib/prisma';
import { sendCommentMentionEmail } from '@/lib/resend/comment-mention';

export const POST = verifySignatureAppRouter(
  async (req: Request) => {
    const parsed = z
      .object({ commentMentionId: z.uuid() })
      .safeParse(await req.json());

    if (!parsed.success) {
      return new Response('invalid payload', {
        status: 489,
        headers: { 'Upstash-NonRetryable-Error': 'true' },
      });
    }

    const { commentMentionId } = parsed.data;
    const mention = await prisma.commentMention.findUnique({
      where: { id: commentMentionId },
      select: {
        notifiedAt: true,
        staffProfile: {
          select: { nickname: true, owner: { select: { email: true } } },
        },
        comment: {
          select: {
            body: true,
            author: { select: { nickname: true } },
            photoShooting: {
              select: {
                id: true,
                package: true,
                client: { select: { owner: { select: { name: true } } } },
                timeSlot: { select: { startTime: true } },
              },
            },
          },
        },
      },
    });

    const shooting = mention?.comment.photoShooting;
    if (mention == null || shooting == null) {
      console.error('[job:comment-mention] unknown mention', {
        commentMentionId,
      });

      return new Response('unknown mention', {
        status: 489,
        headers: { 'Upstash-NonRetryable-Error': 'true' },
      });
    }

    if (mention.notifiedAt != null) {
      return new Response('already sent', { status: 200 });
    }

    const { comment, staffProfile } = mention;

    const mentionedIds = splitMentions(comment.body).flatMap((segment) =>
      typeof segment === 'string' ? [] : [segment.id],
    );
    const mentioned = await prisma.staffProfile.findMany({
      where: { id: { in: mentionedIds } },
      select: { id: true, nickname: true, owner: { select: { name: true } } },
    });

    try {
      const { data, error } = await sendCommentMentionEmail({
        commentMentionId,
        to: staffProfile.owner.email,
        name: staffProfile.nickname,
        authorName: comment.author?.nickname ?? 'Törölt munkatárs',
        shootingLabel: `${shooting.client.owner.name} · ${formatLongDate(shooting.timeSlot.startTime)} · ${shooting.package}`,
        commentBody: comment.body,
        staffById: new Map(
          mentioned.map(({ id, nickname, owner }) => [
            id,
            { id, nickname, name: owner.name },
          ]),
        ),
        commentUrl: `${env.NEXT_PUBLIC_SITE_URL}${APP_URLS.photoShootingAdminPage(shooting.id)}`,
      });

      if (error != null) {
        throw new Error(`Resend rejected the email: ${error.message}`, {
          cause: error,
        });
      }

      // If this write fails, the retry's send is deduplicated by the idempotency key
      await prisma.commentMention.update({
        where: { id: commentMentionId },
        data: { notifiedAt: new Date() },
      });

      console.log('[job:comment-mention] email sent successfully.', {
        commentMentionId,
        resendId: data.id,
      });
    } catch (error) {
      console.error('[job:comment-mention] resend failed', {
        commentMentionId,
        error,
      });
      throw error; //-> 500 -> QStash retries
    }

    return new Response(
      `Comment mention email was sent for CommentMention ID: ${commentMentionId}`,
      { status: 200 },
    );
  },
  {
    devMode: env.QSTASH_DEV,
  },
);
