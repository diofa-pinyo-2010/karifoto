import { describe, expect, it } from 'vitest';

import { LedgerEntryCategory } from '@/generated/prisma/enums';
import {
  buildCheckoutMetadata,
  CHECKOUT_KIND_LEDGER_CATEGORY,
  parseCheckoutMetadata,
} from '@/lib/checkout-metadata';

const BOOKING_INTENT_ID = '7f3d1c62-59a4-4b8e-9f21-0c7a5e2d1b44';

describe('buildCheckoutMetadata', () => {
  it('round-trips through parseCheckoutMetadata', () => {
    const built = buildCheckoutMetadata({
      kind: 'booking_deposit',
      booking_intent_id: BOOKING_INTENT_ID,
    });

    const parsed = parseCheckoutMetadata(built);

    expect(parsed).toEqual({
      ok: true,
      metadata: {
        kind: 'booking_deposit',
        booking_intent_id: BOOKING_INTENT_ID,
      },
    });
  });

  it('produces only string values, since Stripe metadata is string→string', () => {
    const built = buildCheckoutMetadata({
      kind: 'booking_deposit',
      booking_intent_id: BOOKING_INTENT_ID,
    });

    for (const value of Object.values(built)) {
      expect(typeof value).toBe('string');
    }
  });
});

describe('parseCheckoutMetadata', () => {
  it('rejects null, which is what Stripe sends when metadata was never set', () => {
    const parsed = parseCheckoutMetadata(null);

    expect(parsed.ok).toBe(false);
  });

  it('rejects metadata with no kind', () => {
    const parsed = parseCheckoutMetadata({
      booking_intent_id: BOOKING_INTENT_ID,
    });

    expect(parsed.ok).toBe(false);
  });

  // The whole point of the discriminator: a session kind this deploy does not
  // know about must never fall through into the deposit handler.
  it('rejects an unknown kind and names it, so the alert can say what arrived', () => {
    const parsed = parseCheckoutMetadata({
      kind: 'balance',
      photo_shooting_id: BOOKING_INTENT_ID,
    });

    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.reason).toContain('balance');
  });

  it('rejects a booking deposit whose booking_intent_id is missing', () => {
    const parsed = parseCheckoutMetadata({ kind: 'booking_deposit' });

    expect(parsed.ok).toBe(false);
  });

  it('rejects a booking_intent_id that is not a uuid', () => {
    const parsed = parseCheckoutMetadata({
      kind: 'booking_deposit',
      booking_intent_id: 'not-a-uuid',
    });

    expect(parsed.ok).toBe(false);
  });

  it('ignores unrelated keys rather than failing on them', () => {
    const parsed = parseCheckoutMetadata({
      kind: 'booking_deposit',
      booking_intent_id: BOOKING_INTENT_ID,
      something_a_future_deploy_added: 'x',
    });

    expect(parsed.ok).toBe(true);
  });
});

describe('CHECKOUT_KIND_LEDGER_CATEGORY', () => {
  // The category is derived from the kind in code, never carried in the
  // metadata — metadata is written at session-creation time and read much
  // later, so a stored category would go stale if the mapping ever changed.
  it('maps a booking deposit to the deposit income category', () => {
    expect(CHECKOUT_KIND_LEDGER_CATEGORY.booking_deposit).toBe(
      LedgerEntryCategory.INCOME_CLIENT_PAYMENT_DEPOSIT,
    );
  });

  it('maps every kind to an income category', () => {
    for (const category of Object.values(CHECKOUT_KIND_LEDGER_CATEGORY)) {
      expect(category.startsWith('INCOME')).toBe(true);
    }
  });
});
