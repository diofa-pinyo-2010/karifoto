import 'server-only';
import { Prisma } from '@/generated/prisma/client';
import { UPCOMING_SHOOTINGS_TO_SHOW, UUID_RE } from '@/lib/constants';
import { verifySession } from '@/lib/dal';
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
  await verifySession();

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

const timeSlotsPublicSelect = {
  select: {
    id: true,
    startTime: true,
    revealed: true,
    photoShooting: { select: { id: true } },
  },
} satisfies Prisma.TimeSlotDefaultArgs;

export type TimeSlotPublic = Prisma.TimeSlotGetPayload<
  typeof timeSlotsPublicSelect
>;

export async function getTimeSlot(id: string) {
  if (!UUID_RE.test(id)) return null;

  return prisma.timeSlot.findUnique({
    where: { id },
    ...timeSlotsPublicSelect,
  });
}

export async function fetchTimeSlotsPublic() {
  return prisma.timeSlot.findMany({
    where: { startTime: { gte: new Date() } },
    ...timeSlotsPublicSelect,
    orderBy: { startTime: 'asc' },
  });
}

export async function fetchTimeSlotsAdmin() {
  await verifySession();

  return prisma.timeSlot.findMany({
    where: { startTime: { gte: new Date() } },
    select: {
      id: true,
      startTime: true,
      revealed: true,
      photoShooting: {
        select: {
          id: true,
          client: { select: { owner: { select: { name: true } } } },
        },
      },
    },
    orderBy: { startTime: 'asc' },
  });
}

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
    adjustments: { include: { createdBy: { select: { nickname: true } } } },
    sentEmails: {
      select: {
        id: true,
        subject: true,
        resendId: true,
        sentAt: true,
        to: true,
      },
      orderBy: { sentAt: 'desc' },
    },
  },
} satisfies Prisma.PhotoShootingDefaultArgs;

type PhotoShootingDetail = Prisma.PhotoShootingGetPayload<
  typeof photoShootingDetailInclude
>;

export async function getPhotoShooting(
  id: string,
): Promise<PhotoShootingDetail | null> {
  await verifySession();

  if (!UUID_RE.test(id)) return null;

  return prisma.photoShooting.findUnique({
    where: { id },
    ...photoShootingDetailInclude,
  });
}
