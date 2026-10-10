import type { Metadata } from 'next';
import localFont from 'next/font/local';

import { GoogleTagManager } from '@next/third-parties/google';
// A 2026-os arculat kenyérbetűje. Az `index.css` minden subsetet deklarál, de a
// böngésző csak az `unicode-range`-nek megfelelőt tölti le — magyar szöveghez a
// latin + latin-ext párost. Szándékosan nem `next/font/local`: a variable
// Manrope subsetenként külön woff2-ben jön, a `localFont` pedig nem tud
// fájlonkénti `unicode-range`-et, enélkül pedig az ő és ű kimaradna.
import '@fontsource-variable/manrope';
// Cormorant álló és dőlt vágata. A dőlt külön fájlban jön, és valódi kurzív
// betűformákat hoz — nem a böngésző döntögeti meg az állót. A `<em>`-ek
// (pl. a foglalási szekció címében) ettől lesznek helyesek.
import '@fontsource-variable/cormorant-garamond';
import '@fontsource-variable/cormorant-garamond/wght-italic.css';

import '@/app/globals.css';
import { CookieConsentBanner } from '@/components/CookieConsentBanner';
import { CookiePreferencesButton } from '@/components/CookiePreferencesButton';
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
const CONSENT_DEFAULT_SCRIPT = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});`;

// Self-hosted (src/fonts) so dev/build never depends on reaching Google Fonts.
// Files are the official google/fonts variable TTFs, weight-limited and
// subset to latin + latin-ext, converted to woff2.
//
// A Cormorant kivétel: a dőlt vágata subsetenként külön woff2-ben érhető el, a
// `localFont` viszont nem tud fájlonkénti `unicode-range`-et, így egyetlen
// faceként nem lehetett volna álló + dőlt párost képezni. Ezért a Cormorant a
// `@fontsource-variable/cormorant-garamond` csomagból jön (lásd a fenti
// importokat), és nem itt van deklarálva.
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
        script.variable,
        sans.variable,
        mono.variable,
        'font-sans',
      )}
      suppressHydrationWarning
    >
      <head>
        <InlineScript html={THEME_SCRIPT} />
        <InlineScript html={CONSENT_DEFAULT_SCRIPT} />
      </head>
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <ThemeScope />
        <Providers>{children}</Providers>
        <CookieConsentBanner />
        <CookiePreferencesButton />
        <GoogleTagManager gtmId="GTM-MDZ7PG3Q" />
      </body>
    </html>
  );
}
