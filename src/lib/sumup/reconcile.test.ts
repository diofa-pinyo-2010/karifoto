import { describe, expect, it } from 'vitest';

import {
  ATTEMPT_FORCE_CLOSE_AFTER_MS,
  ATTEMPT_RECONCILE_AFTER_MS,
  ATTEMPT_RECONCILE_INTERVAL_MS,
  MANUAL_CLOSE_REASON,
  canForceCloseAttempt,
  resolveAttemptReconcile,
  shouldReconcileAttempt,
} from '@/lib/sumup/reconcile';

const NOW = new Date('2026-12-20T10:00:00Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms);

describe('resolveAttemptReconcile', () => {
  const open = {
    status: 'PENDING',
    failureReason: null,
    amountInCents: 39000_00,
  } as const;

  it('closes an open attempt with the SumUp status', () => {
    expect(
      resolveAttemptReconcile({
        attempt: open,
        status: 'SUCCESSFUL',
        currency: 'HUF',
        amount: 39000,
      }),
    ).toEqual({ kind: 'update', status: 'SUCCESSFUL' });
    expect(
      resolveAttemptReconcile({
        attempt: open,
        status: 'FAILED',
        currency: 'HUF',
        amount: 39000,
      }),
    ).toEqual({ kind: 'update', status: 'FAILED' });
  });

  it('flags a successful payment with a different amount or currency', () => {
    expect(
      resolveAttemptReconcile({
        attempt: open,
        status: 'SUCCESSFUL',
        currency: 'HUF',
        amount: 3900,
      }),
    ).toEqual({ kind: 'amount-mismatch' });
    expect(
      resolveAttemptReconcile({
        attempt: open,
        status: 'SUCCESSFUL',
        currency: 'EUR',
        amount: 39000,
      }),
    ).toEqual({ kind: 'amount-mismatch' });
  });

  it('does not check the amount of a failed payment', () => {
    expect(
      resolveAttemptReconcile({
        attempt: open,
        status: 'FAILED',
        currency: undefined,
        amount: undefined,
      }),
    ).toEqual({ kind: 'update', status: 'FAILED' });
  });

  it('alerts on a success arriving after a manual close', () => {
    expect(
      resolveAttemptReconcile({
        attempt: {
          ...open,
          status: 'FAILED',
          failureReason: MANUAL_CLOSE_REASON,
        },
        status: 'SUCCESSFUL',
        currency: 'HUF',
        amount: 39000,
      }),
    ).toEqual({ kind: 'late-success-after-manual-close' });
  });

  it('ignores anything else on a closed attempt', () => {
    expect(
      resolveAttemptReconcile({
        attempt: { ...open, status: 'FAILED', failureReason: 'declined' },
        status: 'SUCCESSFUL',
        currency: 'HUF',
        amount: 39000,
      }),
    ).toEqual({ kind: 'already-closed' });
    expect(
      resolveAttemptReconcile({
        attempt: { ...open, status: 'SUCCESSFUL' },
        status: 'SUCCESSFUL',
        currency: 'HUF',
        amount: 39000,
      }),
    ).toEqual({ kind: 'already-closed' });
  });
});

describe('shouldReconcileAttempt', () => {
  it('waits for the webhook first', () => {
    const createdAt = ago(ATTEMPT_RECONCILE_AFTER_MS - 1);
    expect(
      shouldReconcileAttempt(
        { status: 'PENDING', createdAt, updatedAt: createdAt },
        NOW,
      ),
    ).toBe(false);
  });

  it('asks SumUp once the attempt is old and was not touched recently', () => {
    expect(
      shouldReconcileAttempt(
        {
          status: 'PENDING',
          createdAt: ago(ATTEMPT_RECONCILE_AFTER_MS),
          updatedAt: ago(ATTEMPT_RECONCILE_INTERVAL_MS),
        },
        NOW,
      ),
    ).toBe(true);
  });

  it('throttles repeated questions', () => {
    expect(
      shouldReconcileAttempt(
        {
          status: 'PENDING',
          createdAt: ago(ATTEMPT_RECONCILE_AFTER_MS * 2),
          updatedAt: ago(ATTEMPT_RECONCILE_INTERVAL_MS - 1),
        },
        NOW,
      ),
    ).toBe(false);
  });

  it('never asks about a closed attempt', () => {
    const old = ago(ATTEMPT_FORCE_CLOSE_AFTER_MS);
    expect(
      shouldReconcileAttempt(
        { status: 'FAILED', createdAt: old, updatedAt: old },
        NOW,
      ),
    ).toBe(false);
  });
});

describe('canForceCloseAttempt', () => {
  it('allows it only for an open attempt past the threshold', () => {
    expect(
      canForceCloseAttempt(
        { status: 'PENDING', createdAt: ago(ATTEMPT_FORCE_CLOSE_AFTER_MS) },
        NOW,
      ),
    ).toBe(true);
    expect(
      canForceCloseAttempt(
        { status: 'PENDING', createdAt: ago(ATTEMPT_FORCE_CLOSE_AFTER_MS - 1) },
        NOW,
      ),
    ).toBe(false);
    expect(
      canForceCloseAttempt(
        { status: 'CANCELLED', createdAt: ago(ATTEMPT_FORCE_CLOSE_AFTER_MS) },
        NOW,
      ),
    ).toBe(false);
  });
});
