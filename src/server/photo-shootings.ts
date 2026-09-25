'use server';

import { Prisma } from '@/generated/prisma/client';
import { UPCOMING_SHOOTINGS_TO_SHOW } from '@/lib/constants';
import { prisma } from '@/lib/prisma';

const photoShootingWithClientInclude = {
  include: {
    client: { include: { owner: true } },
    timeSlot: { select: { startTime: true } },
  },
} satisfies Prisma.PhotoShootingDefaultArgs;

type PhotoShootingWithClient = Prisma.PhotoShootingGetPayload<
  typeof photoShootingWithClientInclude
>;

export async function fetchUpcomingPhotoShootings(): Promise<
  PhotoShootingWithClient[]
> {
  return prisma.photoShooting.findMany({
    where: {
      AND: {
        timeSlot: { endTime: { gte: new Date() } },
        status: { notIn: ['COMPLETED', 'CLOSED'] },
      },
    },
    take: UPCOMING_SHOOTINGS_TO_SHOW,
    orderBy: { timeSlot: { startTime: 'asc' } },
    ...photoShootingWithClientInclude,
  });
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const photoShootingDetailInclude = {
  include: {
    client: { include: { owner: true } },
    timeSlot: true,
    photographer: { include: { owner: true } },
    editor: { include: { owner: true } },
    ledgerEntries: {
      include: { invoice: true },
      orderBy: { createdAt: 'asc' },
    },
    pricing: true,
    adjustments: true,
  },
} satisfies Prisma.PhotoShootingDefaultArgs;

export type PhotoShootingDetail = Prisma.PhotoShootingGetPayload<
  typeof photoShootingDetailInclude
>;

export async function getPhotoShooting(
  id: string,
): Promise<PhotoShootingDetail | null> {
  if (!UUID_RE.test(id)) return null;

  return prisma.photoShooting.findUnique({
    where: { id },
    ...photoShootingDetailInclude,
  });
}
