type ConsentState = 'granted' | 'denied';

export type GoogleConsentUpdate = {
  analytics_storage: ConsentState;
  ad_storage: ConsentState;
  ad_user_data: ConsentState;
  ad_personalization: 'denied';
};

/**
 * A `gtag('consent', 'update', …)` paramétere a süti banner kategóriáiból
 * (Google Consent Mode v2). Az alapértelmezett `denied`-ot a layout
 * `CONSENT_DEFAULT_SCRIPT`-je állítja be.
 *
 * - `analytics_storage` — GA4.
 * - `ad_storage` — a GTM-ből betöltött Meta Pixel és a Google Ads sütijei.
 * - `ad_user_data` — együtt jár az `ad_storage`-dzsal: nélküle a Google Ads
 *   konverziómérése korlátozott.
 * - `ad_personalization` — mindig `denied`, mert remarketinget nem csinálunk.
 *   Kifejezetten elküldjük, hogy egy későbbi alapértelmezés-változás se
 *   kapcsolhassa be csendben.
 */
export function buildGoogleConsentUpdate({
  analytics,
  marketing,
}: {
  analytics: boolean;
  marketing: boolean;
}): GoogleConsentUpdate {
  const marketingState: ConsentState = marketing ? 'granted' : 'denied';
  return {
    analytics_storage: analytics ? 'granted' : 'denied',
    ad_storage: marketingState,
    ad_user_data: marketingState,
    ad_personalization: 'denied',
  };
}
