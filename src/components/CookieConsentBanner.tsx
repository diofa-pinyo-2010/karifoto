'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import 'vanilla-cookieconsent/dist/cookieconsent.css';
import Clarity from '@microsoft/clarity';
import * as CookieConsent from 'vanilla-cookieconsent';

import { env } from '@/env';

declare global {
  interface Window {
    // A layout `CONSENT_DEFAULT_SCRIPT`-je definiálja, még a GTM előtt.
    gtag?: (...args: unknown[]) => void;
  }
}

let clarityStarted = false;
let analyticsConsentEventPushed = false;

// Google Consent Mode v2: a GTM-ben lévő GA4 csak `analytics_storage: granted`
// mellett fut / ír sütit. Az alapértelmezett `denied`-ot a layout állítja be.
function setGoogleAnalyticsConsent(granted: boolean) {
  window.gtag?.('consent', 'update', {
    analytics_storage: granted ? 'granted' : 'denied',
  });

  // A GTM a consentet csak a trigger pillanatában nézi, a blokkolt taget később
  // nem futtatja újra — ezért a GA4 tag nem page loadra, hanem erre az eventre
  // fut. Oldalbetöltésenként egyszer: a kliensoldali navigáció nem új page load,
  // a page_view-kat onnan a GA4 enhanced measurementje (history change) méri.
  if (granted && !analyticsConsentEventPushed) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'analytics_consent_granted' });
    analyticsConsentEventPushed = true;
  }
}

export function CookieConsentBanner() {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const syncTracking = useRef(() => {
    const isAdmin = pathnameRef.current?.startsWith('/admin');

    const start = () => {
      setGoogleAnalyticsConsent(true);
      if (env.NEXT_PUBLIC_VERCEL_ENV !== 'production') return;
      if (!env.NEXT_PUBLIC_CLARITY_ID) return;
      if (clarityStarted) {
        Clarity.consent(true);
        return;
      }
      Clarity.init(env.NEXT_PUBLIC_CLARITY_ID);
      Clarity.consent(true);
      clarityStarted = true;
    };
    const stop = () => {
      setGoogleAnalyticsConsent(false);
      if (clarityStarted) Clarity.consent(false);
    };

    if (isAdmin) {
      stop();
      return;
    }

    if (CookieConsent.acceptedCategory('analytics')) {
      start();
    } else {
      stop();
    }
  }).current;

  useEffect(() => {
    CookieConsent.run({
      mode: 'opt-in',
      categories: {
        necessary: { enabled: true, readOnly: true },
        analytics: {
          // Visszavont hozzájárulásnál a GA4 sütijeit is töröljük.
          autoClear: {
            cookies: [{ name: /^_ga/ }, { name: '_gid' }],
          },
        },
      },
      language: {
        default: 'hu',
        translations: {
          hu: {
            consentModal: {
              title: 'Sütiket használunk',
              description:
                'Weboldalunkon sütiket (cookie-kat) használunk a felhasználói élmény biztosítása, a működés, valamint a statisztikai és marketing célú elemzések érdekében.',
              // description:
              //   'Weboldalunkon sütiket (cookie-kat) használunk a felhasználói élmény biztosítása, a működés, valamint a statisztikai és marketing célú elemzések érdekében. Részletes tájékoztatást az Adatkezelési Tájékoztatóban talál. Ön az „Összes elfogadása” gombra kattintva hozzájárul a sütik használatához, vagy a beállítások között részletesen is rendelkezhet róluk.',
              acceptAllBtn: 'Összes elfogadása',
              acceptNecessaryBtn: 'Csak a szükségesek',
              showPreferencesBtn: 'Beállítások',
            },
            preferencesModal: {
              title: 'Süti beállítások',
              acceptAllBtn: 'Összes elfogadása',
              acceptNecessaryBtn: 'Csak a szükségesek',
              savePreferencesBtn: 'Mentés',
              sections: [
                {
                  title: 'Szükséges sütik',
                  description:
                    'Az oldal alapvető működéséhez kellenek, nem kapcsolhatók ki.',
                  linkedCategory: 'necessary',
                },
                {
                  title: 'Statisztikai sütik',
                  description:
                    'A Google Analytics és a Microsoft Clarity segítségével anonim, statisztikai elemzéseket végzünk, hogy növeljük a felhasználói élményt. Segít javítanunk az oldalt, hogy érthetőbb, és könnyebben használható legyen.',
                  linkedCategory: 'analytics',
                },
              ],
            },
          },
        },
      },
      onConsent: syncTracking,
      onChange: syncTracking,
    });
  }, [syncTracking]);

  useEffect(() => {
    syncTracking();
  }, [pathname, syncTracking]);

  return null;
}
