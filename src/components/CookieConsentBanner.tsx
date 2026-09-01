'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import 'vanilla-cookieconsent/dist/cookieconsent.css';
import Clarity from '@microsoft/clarity';
import * as CookieConsent from 'vanilla-cookieconsent';

import { env } from '@/env';

let clarityStarted = false;

export function CookieConsentBanner() {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const syncClarity = useRef(() => {
    const isAdmin = pathnameRef.current?.startsWith('/admin');

    const start = () => {
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
        analytics: {},
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
                    'Anonim, statisztikai elemzéseket végzünk, hogy növeljük a felhasználói élményt. Segít javítanunk az oldalt, hogy érthetőbb, és könnyebben használható legyen.',
                  linkedCategory: 'analytics',
                },
              ],
            },
          },
        },
      },
      onConsent: syncClarity,
      onChange: syncClarity,
    });
  }, [syncClarity]);

  useEffect(() => {
    syncClarity();
  }, [pathname, syncClarity]);

  return null;
}
