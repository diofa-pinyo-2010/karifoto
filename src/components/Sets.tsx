'use client';

import { useBooking } from '@/components/BookingProvider';
import { photoSets } from '@/lib/data';

/** Áttekintő (krém háttéren) + egy szekció díszletenként. */
export function Sets() {
  return (
    <>
      <SetsOverview />
      {photoSets.map((s) => (
        <SetSection key={s.id} set={s} />
      ))}
    </>
  );
}

function SetsOverview() {
  return (
    <section
      id="diszletek"
      className="bg-cream px-[18px] py-14 text-[#1A3A2E] sm:px-7 sm:py-[88px]"
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="flex flex-wrap items-end justify-between gap-[26px]">
          <div className="max-w-[640px]">
            <div className="text-[11px] tracking-label text-[#7B8C80] uppercase">
              Díszleteink
            </div>
            <h2 className="mt-3.5 font-display text-[31px] font-medium text-ink sm:text-[50px]">
              Idén két díszlet
              <br />
              várja a családokat
            </h2>
            <p className="mt-[18px] text-[16px] leading-[1.65] font-light text-pretty text-cream-muted sm:text-[17px]">
              Köszönjük, hogy évek óta bizalmat szavaztok nekünk a karácsonyi
              fotózásban. 2026-ban is különleges karácsonyi díszletekkel
              készültünk Nektek. Az időpontok gyorsan fogynak – foglaljatok
              időben!
            </p>
          </div>
          <a
            href="#foglalas"
            className="btn-cta px-6 py-[18px] text-base shadow-[0_14px_32px_rgba(184,80,58,.28)] sm:px-[38px]"
          >
            Szabad időpontok →
          </a>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-3.5 sm:mt-11 sm:grid-cols-3 sm:gap-[18px]">
          {photoSets.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex flex-col gap-3 text-inherit transition-opacity hover:opacity-85"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] border border-ink/[.12] bg-[#E6D6BE]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.thumb}
                  alt={`${s.name} díszlet`}
                  loading="lazy"
                  className="absolute inset-0 block h-full w-full object-cover"
                />
              </div>
              <div>
                <div className="font-display text-[22px] text-ink">
                  {s.name}
                </div>
                <div className="mt-0.5 text-[13px] text-[#5C7064]">
                  {s.tagline}
                </div>
                {s.extra && (
                  <div className="mt-[9px] inline-flex items-center gap-[7px] rounded-full border border-terracotta/30 bg-terracotta/[.07] px-3 py-1.5 text-xs text-[#9C4430]">
                    Extra · Family csomag tartalmazza, vagy külön kérhető
                  </div>
                )}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function SetSection({ set }: { set: (typeof photoSets)[number] }) {
  const b = useBooking();
  const setIndex = photoSets.findIndex((s) => s.id === set.id);

  return (
    <section
      id={set.id}
      className={`border-t border-cream/[.08] px-[18px] py-[52px] sm:px-7 sm:py-[88px] ${set.bg}`}
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="grid grid-cols-1 gap-[22px] [grid-template-areas:'head''media''body'] lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-x-11 lg:gap-y-4 lg:[grid-template-areas:'head_media''body_media']">
          <div className="[grid-area:head]">
            <div className="eyebrow">Díszlet</div>
            <h2 className="mt-3 font-display text-[34px] font-medium text-cream-strong sm:text-[54px]">
              {set.name}
            </h2>
          </div>

          <div className="relative h-[220px] overflow-hidden rounded-[18px] border border-cream/10 bg-panel [grid-area:media] sm:h-[clamp(220px,34vw,520px)] sm:rounded-3xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={set.hero}
              alt={set.heroAlt}
              loading="lazy"
              className="absolute inset-0 block h-full w-full object-cover"
            />
          </div>

          <div className="[grid-area:body]">
            <p className="text-[16px] leading-[1.62] font-light text-pretty text-[#BFCFC6] sm:text-[18px]">
              {set.desc}
            </p>

            <div className="mt-6">
              <div className="text-[11px] tracking-chip text-sage-dim uppercase">
                Uralkodó színek
              </div>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {set.colors.map((c) => (
                  <div
                    key={c.name}
                    className="flex items-center gap-[9px] rounded-full border border-cream/[.16] bg-cream/[.04] py-2 pr-3.5 pl-[9px]"
                  >
                    <span
                      className="h-4 w-4 rounded-full border border-black/20"
                      style={{ background: c.hex }}
                    />
                    <span className="text-sm text-[#D8E2DA]">{c.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {set.extra ? (
              <div className="mt-[26px] flex max-w-[520px] items-start gap-3 rounded-2xl border border-gold/30 bg-gold/[.08] px-[18px] py-4">
                <span className="mt-0.5 font-display text-xl leading-none text-gold">
                  ✦
                </span>
                <span className="text-[15px] leading-[1.55] font-light text-pretty text-[#E7D9BE]">
                  Ezt a díszletet a{' '}
                  <strong className="font-medium text-[#F1E7D5]">
                    Family csomag tartalmazza
                  </strong>
                  , vagy külön kérhető a foglalás során.
                </span>
              </div>
            ) : (
              <a
                href="#foglalas"
                onClick={() => b.selectSet(setIndex)}
                className="btn-cta mt-[26px] px-6 py-[17px] text-base shadow-[0_14px_32px_rgba(184,80,58,.28)] sm:px-9"
              >
                Ezt szeretném →
              </a>
            )}
          </div>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-1.5 sm:mt-12">
          <div className="text-[11px] tracking-chip text-sage-dim uppercase">
            Öltözködési tippek
          </div>
          <p className="mt-1.5 max-w-[780px] text-[15px] leading-[1.68] font-light text-pretty text-sage-soft sm:text-base">
            {set.tips}
          </p>
          <div className="mt-[18px] grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-3.5">
            {set.shots.map((sh, i) => (
              <div
                key={i}
                className="relative aspect-[3/4] overflow-hidden rounded-[14px] border border-cream/10 bg-panel"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sh.src}
                  alt={sh.alt}
                  loading="lazy"
                  className="absolute inset-0 block h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
