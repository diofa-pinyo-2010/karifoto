import type { Metadata } from 'next';
import { Cormorant_Garamond, Jost, Parisienne } from 'next/font/google';

import '@/app/globals.css';
import { TooltipProvider } from '@/components/ui/tooltip';
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
  title: 'Karifoto — karácsonyi családi fotózás',
  description:
    'Felejthetetlen élmény a díszbe borított stúdióban, retusált képek akár 5 napon belül.',
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
      </body>
    </html>
  );
}
