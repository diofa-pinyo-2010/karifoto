import type { Metadata } from 'next';

import { Wordmark } from '@/components/Wordmark';
import { comingSoonFaqs } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Oldalunk épp megújul · Karifoto',
  description:
    'Aktívan dolgozunk az új foglalórendszeren. Addig is hívj minket: +36 30 108 6063.',
  robots: { index: false, follow: false },
};

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-[#0E2620]">
      <div className="lg:flex lg:min-h-screen">
        {/* KÉP — mobilon sáv, lg-től bal oldali hasáb */}
        <section className="relative h-[clamp(240px,52vw,420px)] overflow-hidden bg-panel lg:h-auto lg:w-[46%] lg:flex-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/hofeher-pelda-2.jpg"
            alt="Nagycsalád a Hófehér karácsonyi díszletben"
            className="absolute inset-0 h-full w-full object-cover object-[64%_38%] lg:object-[50%_30%]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,38,32,.15)_0%,rgba(14,38,32,.35)_55%,#0E2620_100%)] lg:bg-[linear-gradient(90deg,rgba(14,38,32,.1)_0%,rgba(14,38,32,.3)_70%,#0E2620_100%)]" />
        </section>

        {/* SZÖVEG */}
        <div className="lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-14 lg:py-20 xl:px-20">
          <header className="flex items-center justify-center border-b border-cream/[.09] px-[18px] py-5 text-cream sm:px-10 lg:justify-start lg:border-0 lg:p-0 lg:pb-10">
            <Wordmark size={22} />
          </header>

          <section className="mx-auto max-w-[720px] px-[18px] text-center sm:px-10 lg:mx-0 lg:max-w-[560px] lg:px-0 lg:text-left">
            <div className="mt-5 inline-flex items-center gap-[9px] rounded-full border border-gold/[.34] bg-gold/[.09] px-4 py-2 text-[11.5px] tracking-[.2em] text-gold uppercase lg:mt-0">
              Hamarosan
            </div>

            <h1 className="mt-[18px] font-display text-[32px] leading-[1.08] font-medium text-balance text-cream-strong sm:text-[50px]">
              Oldalunk épp megújul!
            </h1>

            <p className="mt-[18px] text-base leading-[1.65] font-light text-pretty text-sage-soft sm:text-[18px]">
              Aktívan dolgozunk, hogy a lehető legjobb élményt nyújtsuk Nektek —
              már a foglalás elkezdésétől kezdve, egészen a kész fotók
              átvételéig.
            </p>

            <p className="mt-3.5 text-[15px] leading-[1.65] font-light text-pretty text-sage-dim sm:text-[17px]">
              Addig is, ha bármilyen kérdésetek felmerülne, keressetek bátran az
              alábbi telefonszámon:
            </p>
          </section>

          <section className="mx-auto max-w-[720px] px-[18px] pt-[26px] sm:px-10 lg:mx-0 lg:max-w-[440px] lg:px-0">
            <a
              href="tel:+36301086063"
              className="flex flex-col items-center gap-2 rounded-[20px] border border-gold/30 bg-gold/[.07] px-[22px] py-[26px] text-cream transition-colors hover:bg-gold/[.12] lg:items-start"
            >
              <span className="tracking-chip text-sage-dim uppercase">
                Maru
              </span>
              <span className="text-[30px] leading-none whitespace-nowrap text-gold sm:text-[40px]">
                +36 30 108 6063
              </span>
            </a>
          </section>
        </div>
      </div>

      <section className="mx-auto max-w-[720px] px-[18px] pt-20 pb-14 sm:px-10 sm:pt-24 sm:pb-[90px] lg:max-w-none lg:border-t lg:border-gold/25 lg:pt-32">
        <h2 className="text-center font-display text-[26px] leading-[1.2] font-medium text-cream-strong sm:text-4xl">
          Gyakori kérdések
        </h2>

        <div className="mx-auto mt-[22px] flex max-w-[720px] flex-col gap-3 sm:mt-[30px]">
          {comingSoonFaqs.map((f) => (
            <div
              key={f.q}
              className="rounded-2xl border border-cream/[.09] bg-[#143329] px-[22px] py-5"
            >
              <div className="text-[16.5px] leading-[1.4] text-[#F1E7D5]">
                {f.q}
              </div>
              <div className="mt-2 text-[15px] leading-[1.6] font-light text-pretty text-sage-soft">
                {f.a}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-[30px] text-center text-[14.5px] leading-[1.6] text-pretty text-sage-dim sm:mt-10">
          Nem találtad meg a választ? Hívj minket a fenti számon, és segítünk.
        </div>
      </section>

      <footer className="border-t border-cream/[.09] px-[18px] pt-[22px] pb-[30px] sm:px-10">
        <div className="mx-auto flex max-w-[720px] flex-col items-center gap-2.5 text-center">
          <Wordmark size={18} className="text-[#D8CBB4]" />
          <span className="text-[13px] text-[#6E8478]">
            Karifoto stúdió · Budapest
          </span>
        </div>
      </footer>
    </div>
  );
}
