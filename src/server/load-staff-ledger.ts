import 'server-only';
import { LedgerEntryCategory } from '@/generated/prisma/enums';
import { prisma } from '@/lib/prisma';
import { collectDueItems } from '@/lib/staff-ledger';

import type { Prisma } from '@/generated/prisma/client';

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * Betölti egy munkatárs folyószámlájának minden bemenetét. Az oldal és a
 * kifizetés-rögzítés tranzakciója is ezt hívja, hogy a kettő ugyanazt lássa.
 */
export async function loadStaffLedger(db: Db, staffProfileId: string) {
  const [shootings, taps, payouts] = await Promise.all([
    db.photoShooting.findMany({
      where: {
        OR: [{ photographerId: staffProfileId }, { editorId: staffProfileId }],
      },
      include: {
        pricing: true,
        timeSlot: { select: { startTime: true } },
        client: { select: { owner: { select: { name: true } } } },
        ledgerEntries: {
          where: {
            category: LedgerEntryCategory.INCOME_CLIENT_PAYMENT_BALANCE,
          },
          select: { createdAt: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    }),
    db.reviewTap.findMany({
      where: { staffProfileId },
      orderBy: { createdAt: 'desc' },
      include: { stand: { select: { label: true } } },
    }),
    db.staffPayout.findMany({
      where: { staffProfileId },
      include: {
        ledgerEntries: {
          select: {
            category: true,
            amountInCents: true,
            photoShootingId: true,
            reviewTapId: true,
          },
        },
      },
    }),
  ]);

  const items = collectDueItems(
    staffProfileId,
    shootings.map((shooting) => ({
      ...shooting,
      balancePaidAt: shooting.ledgerEntries[0]?.createdAt ?? null,
    })),
    taps,
  );

  return {
    items,
    payouts,
    shootings: shootings.map((shooting) => ({
      id: shooting.id,
      package: shooting.package,
      isLightPlaySelected: shooting.isLightPlaySelected,
      numberOfPets: shooting.numberOfPets,
      clientName: shooting.client.owner.name,
      startTime: shooting.timeSlot.startTime,
    })),
    taps: taps.map((tap) => ({
      id: tap.id,
      createdAt: tap.createdAt,
      standLabel: tap.stand.label,
      reviewUrl: tap.reviewUrl,
      reviewUrlSetAt: tap.reviewUrlSetAt,
      bonusInCents: tap.bonusInCents,
    })),
  };
}
