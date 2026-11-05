'use client';

import useEmblaCarousel from 'embla-carousel-react';

import { RATING, reviews } from '@/lib/data';

/**
 * 2026-os arculat. Embla a körbeforgatáshoz: húzás érintőn és egérrel is, a
 * slide-okat transzformmal mozgatja, nem klónozza, így a képernyőolvasó minden
 * véleményt egyszer kap meg. Nem új függőség, a `PhotoGallery` már behúzza a
 * publikus oldalra; a `ui/carousel` wrapper viszont csak az adminé.
 *
 * A kártyák közét `pl-4` + `-ml-4` adja, nem `gap`: az Embla az első és az utolsó
 * slide méretébe nem számolja bele a köztes `gap`-et vagy margót, és elcsúszna a
 * körbeérés.
 *
 * Asztali nézetben 3 kártya látszik, ezért legalább 4 vélemény kell: kevesebbnél
 * az Embla némán kikapcsolja a loopot, és a nyilak a végén megállnak.
 */
export function Reviews() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' });

  const scroll = (direction: 1 | -1) => {
    const jump = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (direction === 1) emblaApi?.scrollNext(jump);
    else emblaApi?.scrollPrev(jump);
  };

  return (
    <section
      id="velemenyek"
      aria-labelledby="reviews-title"
      className="brand-section bg-[#eae8df]"
    >
      <div className="brand-shell">
        <div className="mb-9 flex flex-col gap-6 md:mb-12 md:flex-row md:items-end md:justify-between md:gap-12">
          <div>
            <p className="brand-eyebrow">Akik már velünk ünnepeltek</p>
            <h2 id="reviews-title" className="brand-heading">
              A legszebb visszajelzés?
              <br />
              <em>Amikor újra találkozunk.</em>
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
              <span className="brand-stars">★★★★★</span>
            </span>
            <span className="border-b border-brand-ink/25 pb-2">
              {RATING.count} Google-értékelés <span aria-hidden="true">↗</span>
            </span>
          </a>
        </div>

        <div
          ref={emblaRef}
          className="touch-pan-y touch-pinch-zoom overflow-hidden"
        >
          <ul className="-ml-4 flex">
            {reviews.map((r) => (
              <li
                key={r.name}
                // A `+ 1px` kell: az Embla egész pixelre kerekítve mér, és pontos
                // harmadnál minden harmadik szélességen 1px hiányzik a loophoz. A
                // többlet a következő kártya `pl-4`-ébe esik, nem látszik.
                className="w-[88%] shrink-0 pl-4 sm:w-[47%] lg:w-[calc(100%/3+1px)]"
              >
                <div className="h-full rounded-xl border border-[#d9ded3] bg-[#fcfaf4] p-6">
                  <a
                    href={r.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex h-full flex-col"
                  >
                    <span aria-label="5 csillag" className="brand-stars">
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
                </div>
              </li>
            ))}
          </ul>
        </div>

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
