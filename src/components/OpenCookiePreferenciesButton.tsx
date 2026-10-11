'use client';

import { useEffect, useState } from 'react';

import { Button } from '@base-ui/react';
import * as CookieConsent from 'vanilla-cookieconsent';

import { linkClass, rowClass } from '@/components/Footer';

export function OpenCookiePreferenciesButton() {
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

  if (!visible) {
    return null;
  }

  return (
    <Button
      className={`${linkClass} ${rowClass}`}
      onClick={() => CookieConsent.showPreferences()}
    >
      Sütik
      <span aria-hidden="true" className="text-[#c8b68d]">
        →
      </span>
    </Button>
  );
}
