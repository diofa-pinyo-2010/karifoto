import type { Metadata } from 'next';

import { LegalPage, legalTitles } from '@/components/LegalPage';

// Tervezet, nem hatályos dokumentum — a keresőkből ki kell maradnia. Ez
// szerveroldali meta tag, tehát a JS-t nem futtató crawlerek is látják.
export const metadata: Metadata = {
  title: `${legalTitles.adatkezeles} – tervezet`,
  robots: { index: false, follow: false },
};

export default function Page() {
  return <LegalPage slug="adatkezeles" />;
}
