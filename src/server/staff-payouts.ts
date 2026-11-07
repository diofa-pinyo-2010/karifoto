'use server';

import { revalidatePath } from 'next/cache';

import * as z from 'zod';

import { Prisma } from '@/generated/prisma/client';
import { PaymentMethod, StaffProfileRole } from '@/generated/prisma/enums';
import { APP_URLS, GOOGLE_REVIEW_BONUS_IN_CENTS } from '@/lib/constants';
import { verifySession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';
import { parseReviewUrl } from '@/lib/review-url';
import { allocatePayout } from '@/lib/staff-ledger';
import { hufToCents } from '@/lib/utils';
import { loadStaffLedger } from '@/server/load-staff-ledger';

const recordStaffPayoutSchema = z.object({
  staffProfileId: z.uuid(),
  amountHuf: z.number().int().positive(),
  method: z.enum([PaymentMethod.CASH, PaymentMethod.TRANSFER]),
  note: z.string().trim().max(500).nullable(),
});

/**
 * Egy kifizetés rögzítése. Az összeget a legrégebbi esedékes tételektől
 * kezdve szétosztjuk, és tételenként egy `LedgerEntry` készül — így utólag is
 * látszik, mennyi ment fotós-, szerkesztői díjra és bónuszra.
 */
export async function recordStaffPayout(
  input: z.input<typeof recordStaffPayoutSchema>,
): Promise<{ success: true } | { error: string }> {
  const { staffProfile } = await verifySession();
  if (staffProfile.role !== StaffProfileRole.SUPERADMIN) {
    return { error: 'Nincs jogosultságod ehhez a művelethez.' };
  }

  const parsed = recordStaffPayoutSchema.safeParse(input);
  if (!parsed.success) {
    console.error(parsed.error.issues);
    return { error: 'Adj meg egy pozitív, egész forint összeget.' };
  }
  const { staffProfileId, amountHuf, method } = parsed.data;
  const note = parsed.data.note || null;

  try {
    await prisma.$transaction(async (tx) => {
      /**
       * A munkatárs sorát zároljuk: két párhuzamos rögzítés (dupla kattintás,
       * két admin) így egymás után fut, és a második már látja az elsőt —
       * különben mindkettő a teljes esedékes összeget fizethetné ki.
       */
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "StaffProfile" WHERE id = ${staffProfileId}::uuid FOR UPDATE
      `;
      if (locked.length === 0) {
        throw new PayoutRejectedError('Nem találjuk ezt a munkatársat.');
      }

      const { items, payouts } = await loadStaffLedger(tx, staffProfileId);
      const decision = allocatePayout(items, payouts, hufToCents(amountHuf));
      if (!decision.ok) {
        throw new PayoutRejectedError(decision.error);
      }

      await tx.staffPayout.create({
        data: {
          staffProfileId,
          amountInCents: hufToCents(amountHuf),
          method,
          note,
          ledgerEntries: {
            create: decision.allocations.map(({ item, amountInCents }) => ({
              category: item.category,
              amountInCents: -amountInCents,
              method,
              staffProfileId,
              photoShootingId: item.photoShootingId,
              reviewTapId: item.reviewTapId,
            })),
          },
        },
      });
    });
  } catch (error) {
    if (error instanceof PayoutRejectedError) {
      return { error: error.message };
    }
    console.error('[staff-payouts] failed to record payout', {
      error,
      staffProfileId,
    });
    return { error: 'Nem sikerült rögzíteni a kifizetést. Próbáld újra.' };
  }

  revalidatePath(APP_URLS.staffPayouts);
  revalidatePath(APP_URLS.today);
  return { success: true };
}

/**
 * A review URL egyszer tölthető ki: a feltételes írás csak üres mezőt ír
 * felül, így egy már kifizetett bónusz alapja a felületről nem változhat.
 * Javítani csak kézzel, adatbázisban lehet.
 */
export async function setReviewTapUrl(
  reviewTapId: string,
  url: string | null,
): Promise<{ success: true } | { error: string }> {
  const { staffProfile } = await verifySession();
  if (staffProfile.role !== StaffProfileRole.SUPERADMIN) {
    return { error: 'Nincs jogosultságod ehhez a művelethez.' };
  }

  const parsedId = z.uuid().safeParse(reviewTapId);
  const reviewUrl = parseReviewUrl(url);
  if (!parsedId.success || reviewUrl == null) {
    return { error: 'Adj meg egy érvényes linket.' };
  }

  try {
    const { count } = await prisma.reviewTap.updateMany({
      where: {
        id: parsedId.data,
        reviewUrl: null,
        staffProfileId: { not: null },
      },
      data: {
        reviewUrl,
        reviewUrlSetAt: new Date(),
        bonusInCents: GOOGLE_REVIEW_BONUS_IN_CENTS,
      },
    });
    if (count === 0) {
      return { error: 'Ennél a tapnél már ki van töltve a review URL.' };
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return { error: 'Ez a review URL már egy másik taphez tartozik.' };
    }
    console.error('[staff-payouts] failed to set review url', {
      error,
      reviewTapId,
    });
    return { error: 'Nem sikerült menteni a review URL-t. Próbáld újra.' };
  }

  revalidatePath(APP_URLS.staffPayouts);
  return { success: true };
}

/** Csak a tranzakció megszakítására, a hívón kívül nem látszik. */
class PayoutRejectedError extends Error {}
