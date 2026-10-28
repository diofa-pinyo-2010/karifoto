import { describe, expect, it } from 'vitest';

import {
  bookingCompletedStorageKey,
  buildBookingCompletedEvent,
} from '@/lib/booking-tracking';

const PHOTO_SHOOTING_ID = '3b9f6c1e-2d4a-4f7b-8e15-6a0c9d2b7e31';

describe('buildBookingCompletedEvent', () => {
  it('uses the photo shooting id as the event id', () => {
    const event = buildBookingCompletedEvent({
      photoShootingId: PHOTO_SHOOTING_ID,
      totalToBeInvoicedInCents: 59_000_00,
    });

    expect(event.event_id).toBe(PHOTO_SHOOTING_ID);
  });

  it('converts fillér to whole forints', () => {
    const event = buildBookingCompletedEvent({
      photoShootingId: PHOTO_SHOOTING_ID,
      totalToBeInvoicedInCents: 59_000_00,
    });

    expect(event).toEqual({
      event: 'booking_completed',
      event_id: PHOTO_SHOOTING_ID,
      value: 59_000,
      currency: 'HUF',
    });
  });

  it('carries only the agreed keys, so no personal data can slip in', () => {
    const event = buildBookingCompletedEvent({
      photoShootingId: PHOTO_SHOOTING_ID,
      totalToBeInvoicedInCents: 1_00,
    });

    expect(Object.keys(event).toSorted()).toEqual([
      'currency',
      'event',
      'event_id',
      'value',
    ]);
  });
});

describe('bookingCompletedStorageKey', () => {
  it('is distinct per booking', () => {
    expect(bookingCompletedStorageKey('a')).not.toBe(
      bookingCompletedStorageKey('b'),
    );
  });
});
