import Link from 'next/link';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { RATING, reviews } from '@/lib/data';

const arrowClassName =
  'static size-11 border-cream/9 bg-panel text-cream-strong hover:border-cream hover:bg-panel-active disabled:opacity-30';

export function Reviews() {
  return (
    <section
      id="velemenyek"
      className="mx-auto max-w-300 px-4.5 py-14 sm:px-7 sm:py-22"
    >
      <Carousel opts={{ align: 'start', loop: false }} aria-label="Vélemények">
        <div className="mb-7 text-center sm:mb-11">
          <div className="eyebrow">Google értékelések</div>
          <h2 className="mt-3.5 mb-1.5 font-display text-[31px] font-medium text-cream-strong sm:text-[50px]">
            {RATING.score} / 5 · {RATING.count} család
          </h2>
          <Link
            href="https://maps.app.goo.gl/MLT1TbNYy8n1JMFKA"
            className="text-sm text-[#93A99D] underline-offset-4 hover:text-[#93A99D]/90 hover:underline"
            target="_blank"
            rel="noreferrer noopener"
          >
            <span className="text-gold">★★★★★</span> &nbsp;valódi, ellenőrzött
            Google vélemények
          </Link>
        </div>

        <CarouselContent className="-ml-3.5">
          {reviews.map((r) => (
            <CarouselItem key={r.name} className="pl-3.5 md:basis-1/3">
              <Link
                href={r.href}
                className="flex h-full flex-col rounded-[20px] border border-cream/9 bg-panel p-7 transition-colors hover:border-cream"
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
                <div className="mt-4 text-sm tracking-[.16em] text-gold">
                  ★★★★★
                </div>
                <p className="mt-3 line-clamp-6 min-h-[6lh] text-[15px] leading-[1.62] font-light text-[#C2D2C8]">
                  {r.text}
                </p>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>

        <div className="mt-7 flex justify-center gap-5">
          <CarouselPrevious className={arrowClassName} />
          <CarouselNext className={arrowClassName} />
        </div>
      </Carousel>
    </section>
  );
}
