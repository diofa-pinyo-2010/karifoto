import { describe, expect, it } from 'vitest';

import { PhotoShootingStatus } from '@/generated/prisma/enums';
import { resolveCashBalancePayment } from '@/server/balance-payment-guard';

import type {
  LedgerEntry,
  PhotoShooting,
  PhotoShootingPricing,
  PriceAdjustment,
} from '@/generated/prisma/client';
import type { ResolveCashBalancePaymentArgs } from '@/server/balance-payment-guard';

// Ugyanaz a megfontolás, mint a pricing.test.ts-ben: kerek, kitalált számok, nem
// a valódi konstansok, mert a PhotoShootingPricing pont azért pillanatkép, hogy
// az árváltozás ne rontsa el a régi fotózásokat — így a tesztet sem.
const PACKAGE = 30_000_00;
const STUDIO = 10_000_00;
const BASE = PACKAGE + STUDIO;
const DEPOSIT = 10_000_00;

const NOW = new Date('2026-12-01T10:00:00.000Z');

function makePricing(
  overrides: Partial<PhotoShootingPricing> = {},
): PhotoShootingPricing {
  return {
    id: 'pricing-1',
    photoShootingId: 'shooting-1',
    packagePriceInCents: PACKAGE,
    packageStudioPriceInCents: STUDIO,
    lightPlayPriceInCents: 0,
    packageEditedImagesAllowance: 10,
    extraPeopleThreshold: 4,
    extraPeopleRateInCents: 0,
    extraPetRateInCents: 0,
    extraEditedImageRateInCents: 0,
    extraRetouchedImageRateInCents: 0,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeShooting(overrides: Partial<PhotoShooting> = {}): PhotoShooting {
  return {
    id: 'shooting-1',
    clientId: 'client-1',
    package: 'CLASSIC',
    decorSet: null,
    isLightPlaySelected: false,
    numberOfGuests: 4,
    numberOfPets: 0,
    timeSlotId: 'slot-1',
    bookingIntentId: null,
    status: 'WAITING_FOR_BALANCE_PAYMENT',
    photographerId: 'staff-1',
    editorId: null,
    selectionRequestedAt: null,
    selectionCompletedAt: null,
    declaredEditedImages: null,
    declaredRetouchedImages: null,
    totalEditedImages: 0,
    totalRetouchedImages: 0,
    rawImagesUrl: null,
    finalImagesUrl: null,
    clientNote: null,
    completedAt: null,
    cancelledAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeLedgerEntry(overrides: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id: 'ledger-1',
    category: 'INCOME_CLIENT_PAYMENT_DEPOSIT',
    amountInCents: DEPOSIT,
    currency: 'HUF',
    method: 'CARD',
    paymentIntent: 'pi_1',
    invoiceId: null,
    photoShootingId: 'shooting-1',
    createdAt: NOW,
    updatedAt: NOW,
    stripeRefundId: 'sr_1',
    refundedEntryId: 're_1',
    ...overrides,
  };
}

function makeAdjustment(
  overrides: Partial<PriceAdjustment> = {},
): PriceAdjustment {
  return {
    id: 'adjustment-1',
    type: 'DISCOUNT',
    amountInCents: 0,
    publicLabel: 'Kedvezmény',
    internalNote: 'teszt',
    createdById: 'staff-1',
    bookingIntentId: null,
    photoShootingId: 'shooting-1',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

/** A tipikus eset: előleg befizetve, a hátralék készpénzben jön a stúdióban. */
function args(
  overrides: Partial<ResolveCashBalancePaymentArgs> = {},
): ResolveCashBalancePaymentArgs {
  return {
    status: PhotoShootingStatus.WAITING_FOR_BALANCE_PAYMENT,
    pricing: makePricing(),
    shooting: makeShooting(),
    adjustments: [],
    ledgerEntries: [makeLedgerEntry()],
    ...overrides,
  };
}

describe('resolveCashBalancePayment', () => {
  it('collects the remainder after the deposit', () => {
    const result = resolveCashBalancePayment(args());

    expect(result).toEqual({ ok: true, amountInCents: BASE - DEPOSIT });
  });

  /**
   * A dupla rögzítés elleni egyetlen védelem. A készpénzes tételnek nincs
   * `paymentIntent`-je, tehát a Stripe-os utat védő unique index itt nem
   * segít — ez a feltétel az, ami a második kattintást megfogja.
   */
  it('refuses when a balance payment already exists', () => {
    const result = resolveCashBalancePayment(
      args({
        ledgerEntries: [
          makeLedgerEntry(),
          makeLedgerEntry({
            id: 'ledger-2',
            category: 'INCOME_CLIENT_PAYMENT_BALANCE',
            method: 'CASH',
            paymentIntent: null,
            amountInCents: 1,
          }),
        ],
      }),
    );

    expect(result.ok).toBe(false);
  });

  // Akkor is, ha a státusz ezt egyébként engedné: a ledger a pénz forrása,
  // nem a státusz.
  it('refuses a duplicate even when the status still says it is collectable', () => {
    const result = resolveCashBalancePayment(
      args({
        status: PhotoShootingStatus.WAITING_FOR_BALANCE_PAYMENT,
        ledgerEntries: [
          makeLedgerEntry({
            category: 'INCOME_CLIENT_PAYMENT_BALANCE',
            amountInCents: 1,
          }),
        ],
      }),
    );

    expect(result.ok).toBe(false);
  });

  /**
   * Végigmegyünk az összes többi státuszon, hogy egy új `PhotoShootingStatus`
   * ne tudjon csendben fizethetővé válni. Kiemelten: az extra fizetés Stripe-os,
   * ott nem vehetünk át készpénzt.
   */
  it.each(
    Object.values(PhotoShootingStatus).filter(
      (status) => status !== PhotoShootingStatus.WAITING_FOR_BALANCE_PAYMENT,
    ),
  )('refuses in status %s', (status) => {
    const result = resolveCashBalancePayment(args({ status }));

    expect(result.ok).toBe(false);
  });

  it('refuses without a pricing snapshot', () => {
    const result = resolveCashBalancePayment(args({ pricing: null }));

    expect(result.ok).toBe(false);
  });

  it('refuses when there is nothing left to collect', () => {
    const result = resolveCashBalancePayment(
      args({
        ledgerEntries: [makeLedgerEntry({ amountInCents: BASE })],
      }),
    );

    expect(result.ok).toBe(false);
  });

  // Túlfizetés: negatív összeget semmiképp nem írunk a ledgerbe.
  it('refuses when the client has overpaid', () => {
    const result = resolveCashBalancePayment(
      args({
        ledgerEntries: [makeLedgerEntry({ amountInCents: BASE + 1_000_00 })],
      }),
    );

    expect(result.ok).toBe(false);
  });

  /**
   * Ez bukik el, ha valaki később a konstansokból számolja újra az összeget a
   * pillanatkép + korrekciók helyett.
   */
  it('takes discounts off the collected amount', () => {
    const result = resolveCashBalancePayment(
      args({ adjustments: [makeAdjustment({ amountInCents: 5_000_00 })] }),
    );

    expect(result).toEqual({
      ok: true,
      amountInCents: BASE - DEPOSIT - 5_000_00,
    });
  });

  it('returns a Hungarian error message', () => {
    const result = resolveCashBalancePayment(args({ pricing: null }));

    if (result.ok) throw new Error('expected a refusal');
    expect(result.error).toMatch(/[áéíóöőúüű]/i);
  });
});
