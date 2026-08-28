import Image from 'next/image';

import { RATING, SLOTS_LEFT_LABEL } from '@/lib/data';

export function Hero() {
  return (
    <section className="px-4.5 pt-11 text-center sm:px-7 sm:pt-21.5">
      <div className="mx-auto max-w-225">
        <div className="eyebrow">2026 · Karácsonyi szezon · Budapest</div>

        <h1 className="font-display text-cream-strong mt-4 text-[38px] leading-[1.05] font-medium text-balance sm:mt-5.5 sm:text-[78px]">
          Karácsonyi családi fotózás,
          <br />
          <em className="text-gold italic">amit évekig előveszel</em>
        </h1>

        <p className="mx-auto mt-4.5 max-w-140 text-base leading-[1.62] font-light text-pretty text-[#BFCFC6] sm:mt-6.5 sm:text-[18px]">
          45 perc a díszbe borított stúdiónkban, gyerekbarát tempóban. A képeket
          5 napon belül megkapod — időben a karácsonyi ajándékhoz.
        </p>

        <div className="mt-6.5 flex flex-wrap items-center justify-center gap-3 sm:mt-9.5 sm:gap-4">
          <a
            href="#foglalas"
            className="btn-cta shadow-cta px-6.5 py-4.5 text-base sm:px-10.5 sm:text-[17px]"
          >
            Időpont foglalása →
          </a>
          <a
            href="#csomagok"
            className="border-cream/25 hover:border-gold rounded-full border px-5.5 py-4.5 text-base text-[#D8E2DA] transition-colors sm:px-6.5"
          >
            Csomagok és árak
          </a>
        </div>

        <div className="mt-5.5 flex flex-wrap justify-center gap-x-5 gap-y-2.5 text-[13px] text-[#93A99D]">
          <span>
            ★★★★★ {RATING.score} a Google-on ({RATING.count} értékelés)
          </span>
          <span className="hidden sm:inline">·</span>
          <span>{SLOTS_LEFT_LABEL}</span>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-310 sm:mt-14">
        <div className="border-gold/20 bg-ink relative h-[clamp(280px,52vw,540px)] overflow-hidden rounded-[20px_20px_28px_28px] border">
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
    </section>
  );
}
