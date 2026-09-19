'use server';

import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';

const photoShootingWithClientInclude = {
  include: {
    client: { include: { owner: true } },
    timeSlot: { select: { startTime: true } },
  },
} satisfies Prisma.PhotoShootingDefaultArgs;

export type PhotoShootingWithClient = Prisma.PhotoShootingGetPayload<
  typeof photoShootingWithClientInclude
>;

export async function fetchPhotoShootings(): Promise<
  PhotoShootingWithClient[]
> {
  return prisma.photoShooting.findMany({
    orderBy: { timeSlot: { startTime: 'asc' } },
    ...photoShootingWithClientInclude,
  });
}
