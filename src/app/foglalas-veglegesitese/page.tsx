import type { Metadata } from 'next';
import Link from 'next/link';

import { BookingSummaryLight } from '@/components/BookingSummary';
import { Wordmark } from '@/components/Wordmark';

export const metadata: Metadata = {
  title: 'Foglalás részletei · Karifoto',
};

/**
 * STATIKUS oldal — minden foglalási adat hardcode-olt.
 * TODO(dinamikus): a foglalás a session/DB-ből jön, a nevet és az időpontot propként add át.
 */
export default function BookingLightPage() {
  return (
    <div className="min-h-screen bg-cream pb-[132px]">
      <header className="sticky top-0 z-40 flex items-center gap-3.5 border-b border-ink/[.12] bg-cream/[.94] px-[18px] py-4 backdrop-blur-[10px] sm:px-10">
        <Link href="/" className="text-ink transition-opacity hover:opacity-75">
          <Wordmark size={20} scriptClassName="text-terracotta" />
        </Link>
        <span className="ml-auto text-[11px] tracking-[.22em] text-[#7B8C80] uppercase">
          2 / 3 · Részletek
        </span>
      </header>

      {/* <div className="mt-3.5 flex gap-1 px-[18px] sm:px-10">
        <span className="h-[3px] flex-1 rounded-full bg-terracotta" />
        <span className="h-[3px] flex-1 rounded-full bg-terracotta" />
        <span className="h-[3px] flex-1 rounded-full bg-ink/[.14]" />
      </div> */}

      {/* <section className="mx-auto max-w-[720px] px-[18px] pt-7 pb-2 sm:px-10">
        <div className="text-[11px] tracking-chip text-[#7B8C80] uppercase">
          Szia Anna!
        </div>
        <h1 className="mt-3 font-display text-[30px] leading-[1.1] font-medium text-pretty text-ink sm:text-[44px]">
          Már csak pár részlet,
          <br />
          és lefoglaljuk a helyet
        </h1>
        <p className="mt-3.5 text-base leading-[1.6] font-light text-pretty text-[#41564A]">
          Az alábbi időpontot tartjuk Neked 20 percig. Nézd át az adatokat, add
          meg, hányan jöttök, aztán jöhet a foglaló.
        </p>
      </section> */}

      <BookingSummaryLight />
    </div>
  );
}
