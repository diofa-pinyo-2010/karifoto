import { describe, expect, it } from 'vitest';

import { PhotoShootingStatus } from '@/generated/prisma/enums';
import { resolveStatus } from '@/server/photo-shooting-status';

import type {
  LedgerEntry,
  PhotoShooting,
  PhotoShootingPricing,
  PriceAdjustment,
} from '@/generated/prisma/client';
import type { ResolveStatusArgs } from '@/server/photo-shooting-status';

const NOW = new Date('2026-12-14T12:00:00.000Z');
const BEFORE = new Date('2026-12-10T10:00:00.000Z');
const AFTER = new Date('2026-12-20T10:00:00.000Z');
const NOW_LATER = new Date('2026-12-25T10:00:00.000Z');

const PACKAGE_TOTAL = 40_000_00;

function makePricing(): PhotoShootingPricing {
  return {
    id: 'pricing-1',
    photoShootingId: 'shooting-1',
    packagePriceInCents: 30_000_00,
    packageStudioPriceInCents: 10_000_00,
    lightPlayPriceInCents: 5_000_00,
    packageEditedImagesAllowance: 10,
    extraPeopleThreshold: 4,
    extraPeopleRateInCents: 1_000_00,
    extraPetRateInCents: 2_000_00,
    extraEditedImageRateInCents: 3_000_00,
    extraRetouchedImageRateInCents: 4_000_00,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

/** A shooting that has happened, with a photographer assigned. */
function makeShooting(
  overrides: Partial<PhotoShooting> = {},
  startTime: Date = BEFORE,
): ResolveStatusArgs['current'] {
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
    status: 'WAITING_FOR_THE_DATE',
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
    closedAt: null,
    createdAt: BEFORE,
    updatedAt: BEFORE,
    ...overrides,
    timeSlot: { startTime },
  };
}

function makeLedgerEntry(overrides: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id: 'ledger-1',
    category: 'INCOME_CLIENT_PAYMENT_DEPOSIT',
    amountInCents: 0,
    currency: 'HUF',
    method: 'CARD',
    paymentIntent: null,
    invoiceId: null,
    photoShootingId: 'shooting-1',
    createdAt: BEFORE,
    updatedAt: BEFORE,
    ...overrides,
  };
}

/** Enough income that nothing is owed. */
const paidInFull = [
  makeLedgerEntry({ id: 'deposit', amountInCents: 10_000_00 }),
  makeLedgerEntry({
    id: 'balance',
    category: 'INCOME_CLIENT_PAYMENT_BALANCE',
    amountInCents: PACKAGE_TOTAL - 10_000_00,
  }),
];

function status({
  shooting,
  startTime = BEFORE,
  updates = {},
  adjustments = [],
  ledgerEntries = [],
  now = NOW,
}: {
  shooting?: Partial<PhotoShooting>;
  startTime?: Date;
  updates?: Partial<PhotoShooting>;
  adjustments?: PriceAdjustment[];
  ledgerEntries?: LedgerEntry[];
  now?: Date;
} = {}) {
  return resolveStatus({
    current: makeShooting(shooting, startTime),
    updates,
    pricing: makePricing(),
    adjustments,
    ledgerEntries,
    now,
  });
}

describe('resolveStatus', () => {
  describe('the gates before the shooting', () => {
    it('reports CLOSED regardless of anything else', () => {
      expect(
        status({
          shooting: { closedAt: BEFORE, photographerId: null },
          ledgerEntries: [],
        }),
      ).toBe(PhotoShootingStatus.CLOSED);
    });

    it('asks for a photographer first', () => {
      expect(status({ shooting: { photographerId: null } })).toBe(
        PhotoShootingStatus.PHOTOGRAPHER_SELECTION,
      );
    });

    // Money is owed from the moment the booking exists, so without this gate the
    // balance state would start weeks early — and a végszámla issued then would
    // claim a service that had not happened.
    it('waits for the date while the shooting is still in the future', () => {
      expect(status({ startTime: AFTER, ledgerEntries: [] })).toBe(
        PhotoShootingStatus.WAITING_FOR_THE_DATE,
      );
    });
  });

  describe('the two payment gates', () => {
    it('asks for the balance once the shooting has started and nothing was collected', () => {
      expect(
        status({
          ledgerEntries: [
            makeLedgerEntry({ amountInCents: 10_000_00 }), // deposit only
          ],
        }),
      ).toBe(PhotoShootingStatus.WAITING_FOR_BALANCE_PAYMENT);
    });

    /**
     * The case that makes the two gates different questions.
     *
     * A completed shooting whose client later orders extra images owes money
     * again. If the first gate only asked `toBePaid > 0` it would capture this
     * and offer cash and card — for money that must go through Stripe Checkout.
     * The balance ledger row is what tells the two apart.
     */
    it('asks for an extra payment — not the balance — when a settled shooting owes again', () => {
      expect(
        status({
          shooting: {
            rawImagesUrl: 'https://picdrop.example/raw',
            editorId: 'editor-1',
            finalImagesUrl: 'https://picdrop.example/final',
            totalEditedImages: 13, // 3 over the allowance
          },
          ledgerEntries: paidInFull,
        }),
      ).toBe(PhotoShootingStatus.WAITING_FOR_EXTRA_PAYMENT);
    });

    it('does not ask for the balance twice once a balance row exists', () => {
      expect(
        status({
          shooting: { totalRetouchedImages: 1 },
          ledgerEntries: paidInFull,
        }),
      ).not.toBe(PhotoShootingStatus.WAITING_FOR_BALANCE_PAYMENT);
    });
  });

  describe('the post-shoot workflow, once the balance is in', () => {
    it('asks for the raw images', () => {
      expect(status({ ledgerEntries: paidInFull })).toBe(
        PhotoShootingStatus.RAW_PHOTOS_UPLOAD,
      );
    });

    it('asks for an editor once the raw images are up', () => {
      expect(
        status({
          shooting: { rawImagesUrl: 'https://picdrop.example/raw' },
          ledgerEntries: paidInFull,
        }),
      ).toBe(PhotoShootingStatus.EDITOR_SELECTION);
    });

    it('asks for the final images once an editor is assigned', () => {
      expect(
        status({
          shooting: {
            rawImagesUrl: 'https://picdrop.example/raw',
            editorId: 'editor-1',
          },
          ledgerEntries: paidInFull,
        }),
      ).toBe(PhotoShootingStatus.FINAL_PHOTOS_UPLOAD);
    });

    it('is COMPLETED when everything is delivered and nothing is owed', () => {
      expect(
        status({
          shooting: {
            rawImagesUrl: 'https://picdrop.example/raw',
            editorId: 'editor-1',
            finalImagesUrl: 'https://picdrop.example/final',
          },
          ledgerEntries: paidInFull,
        }),
      ).toBe(PhotoShootingStatus.COMPLETED);
    });
  });

  describe('updates are merged over the stored row', () => {
    it('uses a pending update rather than the stored value', () => {
      expect(
        status({
          shooting: { rawImagesUrl: null },
          updates: { rawImagesUrl: 'https://picdrop.example/raw' },
          ledgerEntries: paidInFull,
        }),
      ).toBe(PhotoShootingStatus.EDITOR_SELECTION);
    });

    // An empty update must not read as "clear every field". Were zod to emit
    // absent optionals as explicit `undefined`, the spread would wipe the
    // photographer and drop the shooting back to the first gate.
    it('changes nothing when there is nothing to update', () => {
      expect(status({ updates: {}, ledgerEntries: paidInFull })).toBe(
        PhotoShootingStatus.RAW_PHOTOS_UPLOAD,
      );
    });
  });

  it('takes the current time as an argument rather than reading the clock', () => {
    // Same shooting, same data — only `now` moves.
    expect(
      status({ startTime: AFTER, now: BEFORE, ledgerEntries: paidInFull }),
    ).toBe(PhotoShootingStatus.WAITING_FOR_THE_DATE);
    expect(
      status({ startTime: AFTER, now: NOW_LATER, ledgerEntries: paidInFull }),
    ).toBe(PhotoShootingStatus.RAW_PHOTOS_UPLOAD);
  });
});
