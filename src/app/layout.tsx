import type { Metadata } from 'next';
import localFont from 'next/font/local';

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

// Az `admin` osztály (rendszerfontok) és a sötét mód csak az adminban él —
// a sötét mód ne fusson le publikus oldalon.
const THEME_SCRIPT = `(function(){try{var a=location.pathname.startsWith('/admin');document.documentElement.classList.toggle('admin',a);if(!a)return;var t=localStorage.getItem('theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})()`;

// Self-hosted (src/fonts) so dev/build never depends on reaching Google Fonts.
// Files are the official google/fonts variable TTFs, weight-limited and
// subset to latin + latin-ext, converted to woff2.
const display = localFont({
  src: '../fonts/CormorantGaramond-Variable.woff2',
  weight: '400 600',
  variable: '--font-cormorant',
  fallback: ['serif'],
  adjustFontFallback: 'Times New Roman',
});
const script = localFont({
  src: '../fonts/Parisienne-Regular.woff2',
  weight: '400',
  variable: '--font-parisienne',
  fallback: ['cursive'],
});
const sans = localFont({
  src: '../fonts/Jost-Variable.woff2',
  weight: '300 600',
  variable: '--font-jost',
  fallback: ['system-ui', 'sans-serif'],
});

const mono = localFont({
  src: '../fonts/GeistMono-Variable.woff2',
  weight: '300 600',
  variable: '--font-geist-mono',
  fallback: ['monospace'],
});

export const metadata: Metadata = {
  title: {
    template: `%s • ${SITE_NAME} 🎄 • karácsonyi fotózás Budapesten`,
    default: `${SITE_NAME} 🎄 • karácsonyi családi fotózás Budapesten 2026-ban`,
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
