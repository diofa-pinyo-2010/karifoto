import type { Metadata } from 'next';
import {
  Cormorant_Garamond,
  Jost,
  Parisienne,
  Geist_Mono,
} from 'next/font/google';

import '@/app/globals.css';
import { CookieConsentBanner } from '@/components/CookieConsentBanner';
import { InlineScript } from '@/components/InlineScript';
import { Providers } from '@/components/Providers';
import { ThemeScope } from '@/components/ThemeScope';
// import { CookiePreferencesButton } from '@/components/CookiePreferencesButton';
import {
  PHOTO_DELIVERY_DEADLINE_DAYS_AFTER_CLIENT_MADE_SELECTION,
  SITE_NAME,
} from '@/lib/constants';
import { cn } from '@/lib/utils';

// A sötét mód csak az adminban él — ne fusson le publikus oldalon.
const THEME_SCRIPT = `(function(){try{if(!location.pathname.startsWith('/admin'))return;var t=localStorage.getItem('theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})()`;

const display = Cormorant_Garamond({
  subsets: ['latin-ext'],
  weight: ['400', '500', '600'],
  variable: '--font-cormorant',
});
const script = Parisienne({
  subsets: ['latin-ext'],
  weight: ['400'],
  variable: '--font-parisienne',
});
const sans = Jost({
  subsets: ['latin-ext'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-jost',
});

const mono = Geist_Mono({
  subsets: ['latin-ext'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  title: {
    template: `%s | ${SITE_NAME} Karácsonyi fotózás Budapesten 🎄`,
    default: `${SITE_NAME} – Karácsonyi családi fotózás Budapesten 2026-ban 🎄`,
  },
  description: `Felejthetetlen élmény a díszbe borított stúdióban, retusált képek akár ${PHOTO_DELIVERY_DEADLINE_DAYS_AFTER_CLIENT_MADE_SELECTION} napon belül.`,
  // metadataBase: new URL('https://karifoto.hu/'),
  alternates: { canonical: '/' },
  openGraph: {
    siteName: SITE_NAME,
    locale: 'hu_HU',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="hu"
      data-scroll-behavior="smooth"
      className={cn(
        'h-full',
        'antialiased',
        display.variable,
        script.variable,
        sans.variable,
        mono.variable,
        'font-sans',
      )}
      suppressHydrationWarning
    >
      <head>
        <InlineScript html={THEME_SCRIPT} />
      </head>
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <ThemeScope />
        <Providers>{children}</Providers>
        <CookieConsentBanner />
        {/* <CookiePreferencesButton /> */}
      </body>
    </html>
  );
}
