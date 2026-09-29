import 'server-only';
import { Prisma } from '@/generated/prisma/client';
import { UPCOMING_SHOOTINGS_TO_SHOW, UUID_RE } from '@/lib/constants';
import { getPortalAccess, verifySession } from '@/lib/dal';
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

const photoShootingForClientPortalSelect = {
  select: {
    id: true,
    clientId: true,
    client: { select: { owner: { select: { name: true } } } },
    status: true,
    package: true,
    decorSet: true,
    isLightPlaySelected: true,
    numberOfGuests: true,
    numberOfPets: true,
    clientNote: true,
    timeSlot: { select: { startTime: true } },
    photographer: { select: { nickname: true } },
    // Az Invoice-nak nincs createdAt-je, a számlaszám viszont növekvő.
    invoices: {
      select: {
        id: true,
        invoiceNumber: true,
        publicUrl: true,
        amountInCents: true,
        currency: true,
        status: true,
      },
      orderBy: { invoiceNumber: 'asc' },
    },
  },
} satisfies Prisma.PhotoShootingDefaultArgs;

export type PhotoShootingForClientPortal = Prisma.PhotoShootingGetPayload<
  typeof photoShootingForClientPortalSelect
>;

/*
 * Szándékosan NEM `verifySession()`, mint a fájl többi lekérdezése: az
 * staff-only és `/admin/login`-ra irányít, tehát minden ügyfelet kidobna a
 * saját portáljáról. A kaput a `getPortalAccess()` adja.
 *
 * A "nincs ilyen" és a "nem a tiéd" egyaránt `null`: a hívó mindkettőre 404-et
 * mutat, így a válasz nem árulja el, hogy létezik-e a másik fotózás.
 *
 * A sorrend miatt előbb olvasunk, aztán engedélyezünk: a jogosultság a fotózás
 * `clientId`-jához mérendő, amit csak a lekérdezés után ismerünk.
 */
export async function fetchPhotoShootingForClientPortal(
  photoShootingId: string,
) {
  if (!UUID_RE.test(photoShootingId)) return null;

  const photoShooting = await prisma.photoShooting.findUnique({
    where: { id: photoShootingId },
    ...photoShootingForClientPortalSelect,
  });

  if (photoShooting == null) return null;

  const access = await getPortalAccess(photoShooting.clientId);

  return access == null ? null : photoShooting;
}
