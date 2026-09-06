import Image from 'next/image';
import Link from 'next/link';

import { RATING } from '@/lib/data';

export function Hero() {
  return (
    <section className="px-4.5 pt-4 text-center sm:px-7 sm:pt-21.5">
      <div className="mx-auto max-w-225">
        {/* <div className="eyebrow">2026 · Karácsonyi szezon · Budapest</div> */}

        <h1 className="mt-6 font-display text-[44px] leading-[1.05] font-medium text-balance text-cream-strong sm:mt-5.5 sm:text-[78px]">
          Karácsonyi fotózás
          <br />
          <span className="text-[38px] text-gold">Budapest szívében</span>
        </h1>

        <p className="mx-auto mt-2 max-w-140 text-base leading-[1.62] font-light text-pretty text-[#BFCFC6] sm:mt-6.5 sm:text-[18px]">
          Örökítsd meg velünk az év legszebb pillanatait legújabb
          díszleteinkben!
        </p>
        <Link
          href="#velemenyek"
          className="mt-5.5 flex flex-wrap justify-center gap-x-5 gap-y-2.5 text-[13px] text-[#93A99D] underline-offset-4 hover:text-[#93A99D]/90 hover:underline"
        >
          <span>
            <span className="text-gold">★★★★★</span> {RATING.score} a Google-on
            ({RATING.count} értékelés)
          </span>
        </Link>
        <div className="mx-auto mt-6 max-w-310 sm:mt-14">
          <div className="relative -mx-4.5 h-[clamp(280px,52vw,540px)] overflow-hidden border border-gold/20 bg-ink lg:rounded-2xl">
            <Image
              src="/images/hero-anya-lanya.jpg"
              alt="Anya és kislánya a karácsonyi stúdióban"
              fill
              priority
              sizes="(max-width: 1240px) 100vw, 1240px"
              className="object-cover object-[center_22%]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,38,32,.28)_0%,rgba(14,38,32,0)_40%,rgba(14,38,32,.55)_100%)]" />
          </div>
        </div>

        <div className="mt-6.5 flex w-full flex-wrap items-center justify-center gap-3 sm:mt-9.5 sm:gap-4">
          <div className="flex w-full items-center justify-evenly gap-3">
            <a
              href="#csomagok"
              className="w-full rounded-full border border-cream/25 px-8 py-3 text-base text-[#D8E2DA] transition-colors hover:border-gold sm:px-6.5"
            >
              Csomagok
            </a>
            <a
              href="#diszletek"
              className="w-full rounded-full border border-cream/25 px-8 py-3 text-base text-[#D8E2DA] transition-colors hover:border-gold sm:px-6.5"
            >
              Díszletek
            </a>
          </div>
          <a
            href="#foglalas"
            className="btn-cta w-full px-6.5 py-4.5 text-base font-bold tracking-wider uppercase shadow-cta sm:px-10.5 sm:text-[17px]"
          >
            Időpontot foglalok →
          </a>
        </div>
      </div>
    </section>
  );
}
