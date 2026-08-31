import type { Metadata } from 'next';
import { Cormorant_Garamond, Jost, Parisienne } from 'next/font/google';

import '@/app/globals.css';
import { CookieConsentBanner } from '@/components/CookieConsentBanner';
import { CookiePreferencesButton } from '@/components/CookiePreferencesButton';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  PHOTO_DELIVERY_DEADLINE_DAYS_AFTER_CLIENT_MADE_SELECTION,
  SITE_NAME,
} from '@/lib/constants';
import { cn } from '@/lib/utils';

const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})()`;

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
        'font-sans',
      )}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <TooltipProvider>{children}</TooltipProvider>
        <CookieConsentBanner />
        <CookiePreferencesButton />
      </body>
    </html>
  );
}
