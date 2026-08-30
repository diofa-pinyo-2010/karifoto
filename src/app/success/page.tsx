import type { Metadata } from 'next';
import Link from 'next/link';

import { Wordmark } from '@/components/Wordmark';

export const metadata: Metadata = {
  title: 'Sikeres foglalás · Karifoto',
};

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-40 flex items-center gap-3.5 border-b border-ink/12 bg-cream/94 px-4.5 py-4 backdrop-blur-[10px] sm:px-10">
        <Link href="/" className="text-ink transition-opacity hover:opacity-75">
          <Wordmark size={20} scriptClassName="text-terracotta" />
        </Link>
      </header>
      <section className="mx-auto max-w-130 px-4.5 pt-14 pb-10 text-center sm:px-10">
        <div className="eyebrow">Foglalás</div>
        <h1 className="mt-3.5 font-display text-[30px] leading-[1.1] font-medium text-pretty text-ink sm:text-[38px]">
          Sikeres foglalás!
        </h1>
        <p className="mx-auto mt-3.5 max-w-100 text-base leading-[1.6] font-light text-pretty text-cream-muted">
          Köszönjük az előleg befizetését, ellenőrizd az email fiókodban a
          visszaigazolást.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-terracotta px-6 py-3.5 text-base font-medium text-[#FFF4E6] transition-colors hover:bg-terracotta-hover"
        >
          Vissza a főoldalra
        </Link>
      </section>
    </div>
  );
}
