import type { Metadata } from 'next';
import Image from 'next/image';

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
          <header className="mt-4 -ml-2 flex items-center justify-center px-4.5 text-cream sm:px-10 lg:justify-start lg:p-0 lg:pb-6">
            <Image
              src="/images/karifoto_logo.png"
              alt="Karifoto"
              width={353}
              height={146}
              priority
              className="h-14 w-auto"
            />
          </header>

          <section className="mx-auto max-w-[720px] px-4.5 text-center sm:px-10 lg:mx-0 lg:max-w-[560px] lg:px-0 lg:text-left">
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
              alábbi elérhetőségeken:
            </p>
          </section>

          <section className="mx-auto flex max-w-[720px] flex-col gap-6 px-4.5 pt-[26px] sm:flex-row sm:px-10 lg:mx-0 lg:max-w-[440px] lg:px-0">
            <a
              href="tel:+36301086063"
              className="flex flex-1 flex-col items-center gap-2 rounded-[20px] border border-gold/30 bg-gold/[.07] px-[22px] py-[26px] text-cream transition-colors hover:bg-gold/[.12] lg:items-start"
            >
              <span className="tracking-chip text-sage-dim uppercase">
                Telefon
              </span>
              <span className="text-[22px] leading-none whitespace-nowrap text-gold sm:text-[26px]">
                +36 30 108 6063
              </span>
            </a>
            <a
              href="mailto:info@karifoto.hu"
              className="flex flex-1 flex-col items-center gap-2 rounded-[20px] border border-gold/30 bg-gold/[.07] px-[22px] py-[26px] text-cream transition-colors hover:bg-gold/[.12] lg:items-start"
            >
              <span className="tracking-chip text-sage-dim uppercase">
                Email
              </span>
              <span className="text-[22px] leading-none whitespace-nowrap text-gold sm:text-[26px]">
                info@karifoto.hu
              </span>
            </a>
          </section>
        </div>
      </div>

      {/* <footer className="px-4.5 pt-[22px] pb-[30px] sm:px-10">
        <div className="mx-auto flex max-w-[720px] flex-col items-center gap-2.5 text-center">
          <Wordmark size={18} className="text-[#D8CBB4]" />
          <span className="text-[13px] text-[#6E8478]">
            Karifoto stúdió · Budapest
          </span>
        </div>
      </footer> */}
    </div>
  );
}
