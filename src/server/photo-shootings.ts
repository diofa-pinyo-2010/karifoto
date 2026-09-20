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

export async function fetchPhotoShootings(): Promise<
  PhotoShootingWithClient[]
> {
  return prisma.photoShooting.findMany({
    where: {
      AND: {
        timeSlot: { startTime: { gte: new Date() } },
        status: { notIn: ['COMPLETED', 'CLOSED'] },
      },
    },
    take: UPCOMING_SHOOTINGS_TO_SHOW,
    orderBy: { timeSlot: { startTime: 'asc' } },
    ...photoShootingWithClientInclude,
  });
}
