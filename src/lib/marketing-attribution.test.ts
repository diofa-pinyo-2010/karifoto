import { describe, expect, it } from 'vitest';

import {
  buildMarketingAttribution,
  hasMarketingConsent,
} from '@/lib/marketing-attribution';

const cookieWith = (categories: unknown) =>
  encodeURIComponent(JSON.stringify({ categories, revision: 0 }));

describe('hasMarketingConsent', () => {
  it('is true when the categories include marketing (URL-encoded)', () => {
    expect(
      hasMarketingConsent(cookieWith(['necessary', 'analytics', 'marketing'])),
    ).toBe(true);
  });

  it('accepts an already decoded value', () => {
    expect(
      hasMarketingConsent(JSON.stringify({ categories: ['marketing'] })),
    ).toBe(true);
  });

  it('is false without the marketing category', () => {
    expect(hasMarketingConsent(cookieWith(['necessary', 'analytics']))).toBe(
      false,
    );
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['not JSON', 'marketing'],
    ['broken encoding', '%E0%A4%A'],
    ['JSON null', 'null'],
    ['a bare array', '["marketing"]'],
    ['categories not an array', cookieWith('marketing')],
  ])('is false for a %s cookie', (_, value) => {
    expect(hasMarketingConsent(value)).toBe(false);
  });
});

describe('buildMarketingAttribution', () => {
  const request = {
    fbp: 'fb.1.1700000000000.123456789',
    fbc: 'fb.1.1700000000000.AbCdEf',
    forwardedFor: '203.0.113.7, 10.0.0.1',
    userAgent: 'Mozilla/5.0',
  };

  it('keeps the attribution data with marketing consent', () => {
    expect(
      buildMarketingAttribution({
        consentCookie: cookieWith(['necessary', 'marketing']),
        ...request,
      }),
    ).toEqual({
      marketingConsent: true,
      fbp: 'fb.1.1700000000000.123456789',
      fbc: 'fb.1.1700000000000.AbCdEf',
      clientIp: '203.0.113.7',
      userAgent: 'Mozilla/5.0',
    });
  });

  it('stores nothing but the refusal without consent', () => {
    expect(
      buildMarketingAttribution({
        consentCookie: cookieWith(['necessary']),
        ...request,
      }),
    ).toEqual({
      marketingConsent: false,
      fbp: null,
      fbc: null,
      clientIp: null,
      userAgent: null,
    });
  });

  it('stores nothing when the consent cookie is missing', () => {
    expect(
      buildMarketingAttribution({ consentCookie: undefined, ...request })
        .marketingConsent,
    ).toBe(false);
  });

  it('turns absent or blank values into null', () => {
    expect(
      buildMarketingAttribution({
        consentCookie: cookieWith(['marketing']),
        fbp: undefined,
        fbc: '',
        forwardedFor: null,
        userAgent: '  ',
      }),
    ).toEqual({
      marketingConsent: true,
      fbp: null,
      fbc: null,
      clientIp: null,
      userAgent: null,
    });
  });
});
