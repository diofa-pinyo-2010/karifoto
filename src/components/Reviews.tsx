'use client';

import { useRef } from 'react';

import { RATING, reviews } from '@/lib/data';

/**
 * 2026-os arculat. Nem carousel könyvtár, hanem natív scroll-snap sáv: a
 * húzás-görgetés érintőn és trackpaden így is megvan, a görgetősáv pedig
 * magától jelzi, hogy van még tartalom. A nyilak csak egy képernyőnyit
 * görgetnek — a `snap-mandatory` utána a legközelebbi kártyára igazít, így nem
 * kell elemenkénti indexelés.
 *
 * Egérrel húzni nem lehet (ezt tudná az embla), ez tudatos csere: cserébe nincs
 * carousel-függőség a publikus oldalon.
 */
export function Reviews() {
  const listRef = useRef<HTMLUListElement>(null);

  const scroll = (direction: 1 | -1) => {
    const list = listRef.current;
    if (!list) return;
    list.scrollBy({
      left: direction * list.clientWidth,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  };

  return (
    <section
      id="velemenyek"
      aria-labelledby="reviews-title"
      className="bg-[#eae8df] py-16 font-brand-sans text-brand-ink md:py-24 lg:py-28"
    >
      <div className="mx-auto w-full max-w-[1240px] px-6 sm:px-10 lg:px-12">
        <div className="mb-9 flex flex-col gap-6 md:mb-12 md:flex-row md:items-end md:justify-between md:gap-12">
          <div>
            <p className="mb-4 text-[10px] font-semibold tracking-[.23em] text-[#657c79] uppercase sm:text-[11px]">
              Akik már velünk ünnepeltek
            </p>
            <h2
              id="reviews-title"
              className="font-display text-[clamp(2.35rem,5vw,3.8rem)] leading-[1.06] font-medium tracking-[-.025em] text-balance"
            >
              A legszebb visszajelzés?
              <br />
              <em className="text-[#587675] italic">
                Amikor újra találkozunk.
              </em>
            </h2>
          </div>

          <a
            href="https://maps.app.goo.gl/MLT1TbNYy8n1JMFKA"
            target="_blank"
            rel="noreferrer noopener"
            className="flex w-fit flex-col gap-2 text-xs"
          >
            <span className="flex items-center gap-3">
              <strong className="font-display text-5xl">{RATING.score}</strong>
              <span className="tracking-[.1em] whitespace-nowrap text-[#ae793b]">
                ★★★★★
              </span>
            </span>
            <span className="border-b border-brand-ink/25 pb-2">
              {RATING.count} Google-értékelés <span aria-hidden="true">↗</span>
            </span>
          </a>
        </div>

        <ul
          ref={listRef}
          className="flex snap-x snap-mandatory [scrollbar-width:thin] [scrollbar-color:#b9c5ba_transparent] gap-4 overflow-x-auto pb-3"
        >
          {reviews.map((r) => (
            <li
              key={r.name}
              // A `calc()`-ban kötelező a szóköz a `-` körül, arbitrary
              // értékben pedig `_` jelöli — enélkül a szabály némán kimarad.
              className="w-[88%] shrink-0 snap-start rounded-xl border border-[#d9ded3] bg-[#fcfaf4] p-6 sm:w-[47%] lg:w-[calc((100%_-_2rem)/3)]"
            >
              <a
                href={r.href}
                target="_blank"
                rel="noreferrer noopener"
                className="flex h-full flex-col"
              >
                <span
                  aria-label="5 csillag"
                  className="tracking-[.1em] whitespace-nowrap text-[#ae793b]"
                >
                  ★★★★★
                </span>
                <p className="mt-5 mb-7 line-clamp-6 text-sm leading-[1.85]">
                  „{r.text}”
                </p>
                <div className="mt-auto flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e5eae2] font-display text-xl"
                  >
                    {r.initial}
                  </span>
                  <div>
                    <strong className="block text-[11px] font-semibold">
                      {r.name}
                    </strong>
                    <span className="mt-1 block text-[10px] text-brand-muted">
                      {r.when}
                    </span>
                  </div>
                  <span aria-hidden="true" className="ml-auto">
                    ↗
                  </span>
                </div>
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-center justify-between gap-4 text-[10px] text-brand-muted">
          <span>Valódi családok. Saját történetek.</span>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Előző vélemények"
              onClick={() => scroll(-1)}
              className="size-11 rounded-full border border-brand-ink/25 text-lg text-brand-ink transition-colors hover:bg-brand-ink/5"
            >
              ←
            </button>
            <button
              type="button"
              aria-label="Következő vélemények"
              onClick={() => scroll(1)}
              className="size-11 rounded-full border border-brand-ink/25 text-lg text-brand-ink transition-colors hover:bg-brand-ink/5"
            >
              →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
