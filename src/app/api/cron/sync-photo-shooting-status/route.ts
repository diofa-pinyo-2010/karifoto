import { env } from '@/env';
import { PhotoShootingStatus } from '@/generated/prisma/enums';
import { prisma } from '@/lib/prisma';
import { syncPhotoShootingStatus } from '@/server/sync-photo-shooting-status';

function isAuthorized(req: Request): boolean {
  return req.headers.get('authorization') === `Bearer ${env.CRON_SECRET}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const dueShootings = await prisma.photoShooting.findMany({
      where: {
        status: PhotoShootingStatus.WAITING_FOR_THE_DATE,
        timeSlot: { startTime: { lte: new Date() } },
      },
      select: { id: true },
    });

    const results = await Promise.allSettled(
      dueShootings.map((shooting) => syncPhotoShootingStatus(shooting.id)),
    );

    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      console.error('[cron:sync-photo-shooting-status] some syncs failed', {
        failed: failures.length,
        total: dueShootings.length,
        reasons: failures.map((f) => String(f.reason)),
      });
      return new Response('Partial failure', { status: 500 });
    }

    return Response.json({ ok: true, synced: dueShootings.length });
  } catch (error) {
    console.error('[cron:sync-photo-shooting-status] failed', error);
    return new Response('Error', { status: 500 });
  }
}
