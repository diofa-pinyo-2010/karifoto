/**
 * The cookie vanilla-cookieconsent stores the visitor's choice in. The banner
 * (`CookieConsentBanner`) does not override `cookie.name`, so this is the
 * library default — change both together.
 */
export const COOKIE_CONSENT_COOKIE_NAME = 'cc_cookie';

/**
 * Whether the vanilla-cookieconsent cookie records consent to the `marketing`
 * category. The value is JSON with a `categories` array; the library
 * URL-encodes it, and depending on who parsed the `Cookie` header it may
 * already be decoded, so both forms are accepted.
 *
 * Anything missing, malformed or unexpected is **no consent** — the server-side
 * Meta event bypasses the banner, so this must fail closed.
 */
export function hasMarketingConsent(rawCookie: string | undefined): boolean {
  if (rawCookie == null || rawCookie === '') return false;

  const parsed = parseJson(rawCookie) ?? parseJson(safeDecode(rawCookie));
  if (parsed == null || typeof parsed !== 'object') return false;

  const categories = (parsed as { categories?: unknown }).categories;
  return Array.isArray(categories) && categories.includes('marketing');
}

function parseJson(value: string | null): unknown {
  if (value == null) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

/**
 * What gets stored on the `BookingIntent` for the server-side Meta Purchase.
 * Without marketing consent every attribution field is `null`, so nothing
 * personal is kept for a visitor who did not agree to it.
 */
export type MarketingAttribution = {
  marketingConsent: boolean;
  fbp: string | null;
  fbc: string | null;
  clientIp: string | null;
  userAgent: string | null;
};

export function buildMarketingAttribution({
  consentCookie,
  fbp,
  fbc,
  forwardedFor,
  userAgent,
}: {
  consentCookie: string | undefined;
  fbp: string | undefined;
  fbc: string | undefined;
  forwardedFor: string | null;
  userAgent: string | null;
}): MarketingAttribution {
  if (!hasMarketingConsent(consentCookie)) {
    return {
      marketingConsent: false,
      fbp: null,
      fbc: null,
      clientIp: null,
      userAgent: null,
    };
  }

  return {
    marketingConsent: true,
    fbp: nonEmpty(fbp),
    fbc: nonEmpty(fbc),
    // The first entry is the original client; the rest are proxies.
    clientIp: nonEmpty(forwardedFor?.split(',')[0]),
    userAgent: nonEmpty(userAgent),
  };
}

function nonEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
