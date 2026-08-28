import Link from 'next/link';

import { RATING, reviews } from '@/lib/data';

export function Reviews() {
  return (
    <section
      id="velemenyek"
      className="mx-auto max-w-300 px-4.5 py-14 sm:px-7 sm:py-22"
    >
      <div className="mb-7 text-center sm:mb-11">
        <div className="eyebrow">Google értékelések</div>
        <h2 className="mt-3.5 mb-1.5 font-display text-[31px] font-medium text-cream-strong sm:text-[50px]">
          {RATING.score} / 5 · {RATING.count} család
        </h2>
        <div className="text-sm text-[#93A99D]">
          ★★★★★ &nbsp;valódi, ellenőrzött Google vélemények
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
        {reviews.map((r) => (
          <Link
            key={r.name}
            href={r.href}
            className="rounded-[20px] border border-cream/9 bg-panel p-7 transition-colors hover:border-cream"
            target="_blank"
            rel="noreferrer noopener"
          >
            <div className="flex items-center gap-3.25">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-terracotta text-base font-medium text-[#FFF4E6]">
                {r.initial}
              </div>
              <div>
                <div className="text-[15px] text-[#F1E7D5]">{r.name}</div>
                <div className="text-xs text-sage-dim">{r.when}</div>
              </div>
            </div>
            <div className="mt-4 text-sm tracking-[.16em] text-gold">★★★★★</div>
            <p className="mt-3 text-[15px] leading-[1.62] font-light text-pretty text-[#C2D2C8]">
              {r.text}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
