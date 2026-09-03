'use client';

import Link from 'next/link';

import { useAppContext } from '@/components/AppContextProvider';
import { PhotoGallery } from '@/components/PhotoGallery';
import { photoSets, type DecorSetKey } from '@/lib/data';

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
      className="bg-cream px-4.5 py-14 text-[#1A3A2E] sm:px-7 sm:py-22"
    >
      <div className="mx-auto max-w-300">
        <div className="flex flex-wrap items-end justify-between gap-6.5">
          <div className="max-w-160">
            <div className="text-[11px] tracking-label text-[#7B8C80] uppercase">
              Épített díszleteink
            </div>
            <h2 className="mt-3.5 font-display text-[31px] font-medium text-ink sm:text-[50px]">
              Idén két díszlet
              <br />
              várja a családokat
            </h2>
            <p className="mt-4.5 text-[16px] leading-[1.65] font-light text-pretty text-cream-muted sm:text-[17px]">
              Köszönjük, hogy évek óta bizalmat szavaztok nekünk a karácsonyi
              fotózásban. 2026-ban is különleges karácsonyi díszletekkel
              készültünk Nektek. Az időpontok gyorsan fogynak – foglaljatok
              időben!
            </p>
          </div>
          <a
            href="#foglalas"
            className="btn-cta px-6 py-4.5 text-base shadow-[0_14px_32px_rgba(184,80,58,.28)] sm:px-9.5"
          >
            Szabad időpontok →
          </a>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-3.5 sm:mt-11 sm:grid-cols-3 sm:gap-4.5">
          {photoSets.map((s) => (
            <Link
              key={s.id}
              href={`#${s.id}`}
              className="flex flex-col gap-3 text-inherit transition-opacity hover:opacity-85"
            >
              <div className="relative aspect-4/3 overflow-hidden rounded-[18px] border border-ink/12 bg-[#E6D6BE]">
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
                  <div className="mt-2.25 inline-flex items-center gap-1.75 rounded-full border border-terracotta/30 bg-terracotta/[.07] px-3 py-1.5 text-xs text-[#9C4430]">
                    Extra · Family csomag tartalmazza, vagy külön kérhető
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function SetCta({
  set,
  onSelect,
  className,
}: {
  set: (typeof photoSets)[number];
  onSelect: (key: DecorSetKey) => void;
  className?: string;
}) {
  return (
    <a
      href="#foglalas"
      onClick={() => onSelect(set.key ?? 'hofeher')}
      className={`btn-cta px-6 py-4.25 text-base shadow-[0_14px_32px_rgba(184,80,58,.28)] sm:px-9 ${className ?? ''}`}
    >
      Ezt szeretném →
    </a>
  );
}

function SetSection({ set }: { set: (typeof photoSets)[number] }) {
  const { selectDecorSet } = useAppContext();

  return (
    <section
      id={set.id}
      className={`border-t border-cream/8 px-4.5 py-13 sm:px-7 sm:py-22 ${set.bg}`}
    >
      <div className="mx-auto max-w-300">
        <div className="max-w-195">
          <div className="eyebrow">Díszlet</div>
          <h2 className="mt-3 font-display text-[34px] font-medium text-cream-strong sm:text-[54px]">
            {set.name}
          </h2>

          <p className="mt-5.5 text-[16px] leading-[1.62] font-light text-pretty text-[#BFCFC6] sm:text-[18px]">
            {set.desc}
          </p>

          {set.colors != null && (
            <div className="mt-6">
              <div className="text-[11px] tracking-chip text-sage-dim uppercase">
                Uralkodó színek
              </div>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {set.colors.map((c) => (
                  <div
                    key={c.name}
                    className="flex items-center gap-2.25 rounded-full border border-cream/16 bg-cream/4 py-2 pr-3.5 pl-2.25"
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
          )}

          {set.extra ? (
            <div className="mt-6.5 flex max-w-130 items-start gap-3 rounded-2xl border border-gold/30 bg-gold/8 px-4.5 py-4">
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
            <SetCta set={set} onSelect={selectDecorSet} className="mt-6.5" />
          )}
        </div>

        <div className="mt-7 sm:mt-12">
          <PhotoGallery photos={set.gallery} />
        </div>

        <div className="mt-7 max-w-195 rounded-2xl border border-cream/12 bg-[#1B3B31] px-5 py-5 sm:mt-10 sm:px-7 sm:py-6.5">
          <div className="text-[11px] tracking-chip text-sage uppercase">
            Öltözködési tippek
          </div>
          <p className="mt-2.5 text-base leading-[1.68] font-light text-pretty text-[#CFDCD4] sm:text-[17px]">
            {set.tips}
          </p>
        </div>

        {!set.extra && (
          <SetCta set={set} onSelect={selectDecorSet} className="mt-7 sm:mt-9" />
        )}
      </div>
    </section>
  );
}
