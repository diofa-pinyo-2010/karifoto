import { describe, expect, it } from 'vitest';

import { buildGoogleConsentUpdate } from '@/lib/consent';

describe('buildGoogleConsentUpdate', () => {
  it('denies everything when nothing is accepted', () => {
    expect(
      buildGoogleConsentUpdate({ analytics: false, marketing: false }),
    ).toEqual({
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
  });

  it('grants only analytics_storage for the analytics category', () => {
    expect(
      buildGoogleConsentUpdate({ analytics: true, marketing: false }),
    ).toEqual({
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
  });

  it('grants ad_storage and ad_user_data together for marketing', () => {
    expect(
      buildGoogleConsentUpdate({ analytics: false, marketing: true }),
    ).toEqual({
      analytics_storage: 'denied',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'denied',
    });
  });

  it('never grants ad_personalization', () => {
    for (const analytics of [true, false]) {
      for (const marketing of [true, false]) {
        expect(
          buildGoogleConsentUpdate({ analytics, marketing }).ad_personalization,
        ).toBe('denied');
      }
    }
  });
});
