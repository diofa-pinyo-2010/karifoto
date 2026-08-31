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
                'Az oldal működéséhez szükséges sütiket mindig használjuk. Az anonim látogatottsági elemzéshez (Microsoft Clarity) a hozzájárulásodat kérjük.',
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
                    'A Microsoft Clarity anonim módon mutatja, hogyan használják az oldalt (kattintás, görgetés). Nélkülük is működik minden.',
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
