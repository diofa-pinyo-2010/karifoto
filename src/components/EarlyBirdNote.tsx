import { Caveat } from 'next/font/google';

import { cn, formatAmount } from '@/lib/utils';
import { EARLY_BIRD_DISCOUNT_AMOUNT } from '@/lib/constants';

const caveat = Caveat({ subsets: ['latin', 'latin-ext'], weight: '600' });

export function EarlyBirdNote() {
  return (
    <div className="mt-6 -mb-6 flex flex-col items-center gap-1 lg:mt-10 lg:-mr-12 lg:mb-0 lg:flex-row lg:justify-end lg:gap-3">
      <p
        className={cn(
          caveat.className,
          '-rotate-3 text-center text-[1.75rem] leading-tight text-brand-accent lg:text-left lg:text-4xl',
        )}
      >
        Csapj le az Early Bird helyekre,
        <br />
        most{' '}
        <span className="relative inline-block">
          {formatAmount(EARLY_BIRD_DISCOUNT_AMOUNT, 'HUF')}
          <svg
            viewBox="0 0 100 8"
            preserveAspectRatio="none"
            fill="none"
            aria-hidden="true"
            className="absolute -bottom-1.5 left-0 h-2 w-full text-brand-champagne"
          >
            <path
              d="M2 6C30 2 60 8 98 3"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </span>{' '}
        kedvezménnyel!
      </p>

      {/* mobil: lefelé mutató nyíl */}
      <svg
        viewBox="0 0 60 70"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="h-14 w-12 text-brand-champagne lg:hidden"
      >
        <path d="M40 4C52 24 44 44 28 62" />
        <path d="M39 58L28 62L30 50" />
      </svg>

      {/* desktop: jobbra mutató nyíl */}
      <svg
        viewBox="0 0 120 60"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="hidden h-16 w-32 shrink-0 text-brand-champagne lg:block"
      >
        <path d="M4 40C30 58 70 56 108 22" />
        <path d="M94 25L108 22L104 35" />
      </svg>
    </div>
  );
}
