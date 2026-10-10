import { describe, expect, it } from 'vitest';

import { buildBookingCompletedEvent } from '@/lib/booking-tracking';
import {
  buildMetaPurchaseEvent,
  hashEmail,
  resolveMetaCapiMode,
} from '@/lib/meta-capi-payload';

import type { MetaPurchaseBookingIntent } from '@/lib/meta-capi-payload';

const PHOTO_SHOOTING_ID = '3b9f6c1e-2d4a-4f7b-8e15-6a0c9d2b7e31';
// sha256('jane.doe@example.com')
const JANE_HASH =
  '86e0b9e56c17cc4d12387e1949b85053fbe73bc3ce5a1188713a9d300cc6133d';

const consented: MetaPurchaseBookingIntent = {
  email: 'jane.doe@example.com',
  marketingConsent: true,
  fbp: 'fb.1.1700000000000.123456789',
  fbc: 'fb.1.1700000000000.AbCdEf',
  clientIp: '203.0.113.7',
  userAgent: 'Mozilla/5.0',
};

const build = (bookingIntent = consented) =>
  buildMetaPurchaseEvent({
    bookingIntent,
    photoShootingId: PHOTO_SHOOTING_ID,
    totalToBeInvoicedInCents: 59_000_00,
    eventSourceUrl: 'https://karifoto.hu/success/abc',
    now: new Date('2026-12-01T10:00:00.500Z'),
  });

describe('hashEmail', () => {
  it('hashes the trimmed, lowercased address', () => {
    expect(hashEmail('  Jane.Doe@Example.COM ')).toBe(JANE_HASH);
  });
});

describe('buildMetaPurchaseEvent', () => {
  it('builds nothing without marketing consent', () => {
    expect(build({ ...consented, marketingConsent: false })).toBeNull();
  });

  it('builds the full Purchase with consent', () => {
    expect(build()).toEqual({
      event_name: 'Purchase',
      event_id: PHOTO_SHOOTING_ID,
      event_time: Math.floor(Date.parse('2026-12-01T10:00:00Z') / 1000),
      action_source: 'website',
      event_source_url: 'https://karifoto.hu/success/abc',
      user_data: {
        em: [JANE_HASH],
        fbp: 'fb.1.1700000000000.123456789',
        fbc: 'fb.1.1700000000000.AbCdEf',
        client_ip_address: '203.0.113.7',
        client_user_agent: 'Mozilla/5.0',
      },
      custom_data: { value: 59_000, currency: 'HUF' },
    });
  });

  it('never sends the plain email', () => {
    expect(JSON.stringify(build())).not.toContain('jane.doe');
  });

  it('matches the browser event id, value and currency', () => {
    const browser = buildBookingCompletedEvent({
      photoShootingId: PHOTO_SHOOTING_ID,
      totalToBeInvoicedInCents: 59_000_00,
    });
    const server = build()!;

    expect(server.event_id).toBe(browser.event_id);
    expect(server.custom_data).toEqual({
      value: browser.value,
      currency: browser.currency,
    });
  });

  it('omits the optional user data that was not stored', () => {
    const event = build({
      ...consented,
      fbp: null,
      fbc: null,
      clientIp: null,
      userAgent: null,
    })!;

    expect(event.user_data).toEqual({
      em: [JANE_HASH],
    });
  });
});

describe('resolveMetaCapiMode', () => {
  it('sends live events in production', () => {
    expect(
      resolveMetaCapiMode({
        vercelEnv: 'production',
        testEventCode: undefined,
      }),
    ).toEqual({ send: true });
  });

  it.each(['preview', 'development', undefined])(
    'sends nothing in %s without a test code',
    (vercelEnv) => {
      expect(
        resolveMetaCapiMode({ vercelEnv, testEventCode: undefined }),
      ).toEqual({ send: false });
    },
  );

  it('sends test events anywhere a test code is set', () => {
    expect(
      resolveMetaCapiMode({ vercelEnv: 'preview', testEventCode: 'TEST123' }),
    ).toEqual({ send: true, testEventCode: 'TEST123' });
  });
});
