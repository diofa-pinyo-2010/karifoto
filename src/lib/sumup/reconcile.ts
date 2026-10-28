import { SumupCheckoutAttemptStatus } from '@/generated/prisma/enums';

import type { SumupCheckoutAttempt } from '@/generated/prisma/client';

/** Ennyi idő után kérdezünk rá mi magunk a SumUp API-ra, ha nem jött webhook. */
export const ATTEMPT_RECONCILE_AFTER_MS = 60_000;
/** Két API-s rákérdezés között legalább ennyi idő telik el (a poll 1,5 mp-es). */
export const ATTEMPT_RECONCILE_INTERVAL_MS = 10_000;
/** Ennyi idő után zárható le kézzel egy beragadt kísérlet. */
export const ATTEMPT_FORCE_CLOSE_AFTER_MS = 5 * 60_000;

/**
 * Ezzel a `failureReason`-nel jelöljük a kézzel lezárt kísérletet: egy később
 * befutó sikeres fizetés ebből tudja, hogy riasztani kell.
 */
export const MANUAL_CLOSE_REASON =
  'Kézzel lezárva: a terminál nem jelzett vissza.';
export const AMOUNT_MISMATCH_REASON =
  'Eltérő összeg a terminálon: a fizetést ellenőrizni kell.';

const OPEN_STATUSES: SumupCheckoutAttemptStatus[] = [
  SumupCheckoutAttemptStatus.INITIATED,
  SumupCheckoutAttemptStatus.PENDING,
];

type AttemptTimes = Pick<SumupCheckoutAttempt, 'status' | 'createdAt'>;

export function isAttemptOpen(attempt: Pick<SumupCheckoutAttempt, 'status'>) {
  return OPEN_STATUSES.includes(attempt.status);
}

export function shouldReconcileAttempt(
  attempt: AttemptTimes & Pick<SumupCheckoutAttempt, 'updatedAt'>,
  now: Date,
) {
  return (
    isAttemptOpen(attempt) &&
    now.getTime() - attempt.createdAt.getTime() >= ATTEMPT_RECONCILE_AFTER_MS &&
    now.getTime() - attempt.updatedAt.getTime() >= ATTEMPT_RECONCILE_INTERVAL_MS
  );
}

export function canForceCloseAttempt(attempt: AttemptTimes, now: Date) {
  return (
    isAttemptOpen(attempt) &&
    now.getTime() - attempt.createdAt.getTime() >= ATTEMPT_FORCE_CLOSE_AFTER_MS
  );
}

export type AttemptReconcileDecision =
  | { kind: 'update'; status: SumupCheckoutAttemptStatus }
  | { kind: 'amount-mismatch' }
  | { kind: 'late-success-after-manual-close' }
  | { kind: 'already-closed' };

/**
 * Mit kezdjünk egy kísérlettel a SumUp által mondott állapot alapján.
 *
 * A webhook és a polling (beragadt kísérletnél) ugyanezt hívja, így a kettő nem
 * térhet el egymástól.
 */
export function resolveAttemptReconcile({
  attempt,
  status,
  currency,
  amount,
}: {
  attempt: Pick<
    SumupCheckoutAttempt,
    'status' | 'failureReason' | 'amountInCents'
  >;
  status: SumupCheckoutAttemptStatus;
  currency: string | undefined;
  /** A SumUp főegységben adja (forint), nem fillérben. */
  amount: number | undefined;
}): AttemptReconcileDecision {
  if (!isAttemptOpen(attempt)) {
    // Kézzel zártuk le, de a pénz mégis megmozdult: ember kell, nem könyvelünk.
    if (
      status === SumupCheckoutAttemptStatus.SUCCESSFUL &&
      attempt.status === SumupCheckoutAttemptStatus.FAILED &&
      attempt.failureReason === MANUAL_CLOSE_REASON
    ) {
      return { kind: 'late-success-after-manual-close' };
    }
    return { kind: 'already-closed' };
  }

  if (
    status === SumupCheckoutAttemptStatus.SUCCESSFUL &&
    (currency !== 'HUF' ||
      Math.round((amount ?? 0) * 100) !== attempt.amountInCents)
  ) {
    return { kind: 'amount-mismatch' };
  }

  return { kind: 'update', status };
}
