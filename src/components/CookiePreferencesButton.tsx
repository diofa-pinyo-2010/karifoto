'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { CookieIcon } from 'lucide-react';
import * as CookieConsent from 'vanilla-cookieconsent';

export function CookiePreferencesButton() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(CookieConsent.validConsent());
    } catch {
      setVisible(false);
    }

    const onShow = (e: Event) => {
      const { modalName } = (
        e as CustomEvent<{ modalName: CookieConsent.ModalName }>
      ).detail;

      if (modalName === 'consentModal') {
        setVisible(false);
      }
    };

    const onHide = (e: Event) => {
      const { modalName } = (
        e as CustomEvent<{ modalName: CookieConsent.ModalName }>
      ).detail;

      if (modalName === 'consentModal') {
        setVisible(true);
      }
    };

    window.addEventListener('cc:onModalShow', onShow);
    window.addEventListener('cc:onModalHide', onHide);

    return () => {
      window.removeEventListener('cc:onModalShow', onShow);
      window.removeEventListener('cc:onModalHide', onHide);
    };
  }, []);

  if (!visible || pathname?.startsWith('/foglalas-veglegesitese')) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => CookieConsent.showPreferences()}
      aria-label="Süti beállítások"
      className="fixed bottom-4 left-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-800 text-white shadow-lg transition hover:bg-neutral-700"
    >
      <CookieIcon className="h-6 w-6" />
    </button>
  );
}
