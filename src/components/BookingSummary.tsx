'use client';

import { useState } from 'react';

import { formatMoney } from '@/lib/utils';

/** A foglalás fix részei — TODO(dinamikus): a kiválasztott csomagból/extrákból számold. */
const PKG_HUF = 49000_00;
const STUDIO_HUF = 9000_00;
const LIGHT_HUF = 15000_00;

const PER_HEAD = 5000_00;
const PER_PET = 5000_00;
const FREE_HEADS = 5;
const DEPOSIT = 10000_00;

/** Időpont + árbontás, létszám/kisállat kérdések, foglaló-tájékoztató és a fizetés CTA. */
export function BookingSummary() {
  const [people, setPeople] = useState(0); // kötelező mező: 0 = nincs megadva
  const [pets, setPets] = useState(0);

  const extraHeads = Math.max(0, people - FREE_HEADS);
  const headFee = extraHeads * PER_HEAD;
  const petFee = pets * PER_PET;
  const total = PKG_HUF + STUDIO_HUF + LIGHT_HUF + headFee + petFee;
  const missingPeople = people === 0;

  return (
    <>
      <section className="mt-[26px] border-y border-cream/[.09] bg-[#122E26]">
        <div className="mx-auto max-w-[720px] px-[18px] pt-[22px] pb-7 sm:px-10">
          <div className="flex items-center gap-3">
            <span className="text-[11px] tracking-chip text-sage-dim uppercase">
              A foglalásod
            </span>
            <span className="ml-auto inline-flex items-center gap-[7px] rounded-full border border-gold/[.32] bg-gold/[.09] px-3 py-1.5 text-xs text-gold">
              Fenntartva · 19:42
            </span>
          </div>

          <div className="mt-3.5 text-[26px] leading-[1.2] text-cream-strong sm:text-[34px]">
            Szombat, december 13. · 11:30
          </div>
          <div className="mt-1.5 text-sm text-sage-dim">
            Karifoto stúdió · Budapest, Rózsa utca 12.
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[720px] px-[18px] pt-[34px] pb-1 sm:px-10">
        <h2 className="mt-2.5 font-display text-xl leading-[1.2] font-medium text-cream-strong sm:text-[32px]">
          Kik lesznek a képeken?
        </h2>
      </section>

      <section className="mx-auto max-w-[720px] px-[18px] pt-[22px] sm:px-10">
        <Stepper
          label={
            <>
              Hányan jönnétek?<span className="ml-1 text-terracotta">*</span>
            </>
          }
          ariaLabel="Hányan jönnétek"
          unit="fő"
          hint={`Az 5 fő fölötti vendégekért ${formatMoney(PER_HEAD)} / fő felárat számolunk.`}
          value={people}
          display={missingPeople ? '–' : String(people)}
          dim={missingPeople}
          min={0}
          max={8}
          onChange={setPeople}
        />
        <div
          className={`mt-2.5 flex items-center gap-[9px] rounded-2xl border px-3.5 py-[11px] text-[13.5px] leading-[1.45] ${
            missingPeople
              ? 'border-terracotta/40 bg-terracotta/10 text-[#F0C9BC]'
              : 'border-gold/[.28] bg-gold/[.07] text-[#D9C9A6]'
          }`}
        >
          <span className="flex-none">{missingPeople ? '✱' : '✓'}</span>
          <span>
            {missingPeople
              ? 'Kötelező megadni — legalább 1 fő kell a továbblépéshez.'
              : `Megvan — ${people === 1 ? 'egy' : people} főre készülünk.`}
          </span>
        </div>
      </section>

      <section className="mx-auto max-w-[720px] px-[18px] pt-[30px] sm:px-10">
        <Stepper
          label="Hoztok-e kisállatot?"
          ariaLabel="Hoztok-e kisállatot"
          unit="db"
          hint={`Kutya, cica, nyuszi is jöhet — ${formatMoney(PER_PET)} / kisállat.`}
          value={pets}
          display={String(pets)}
          min={0}
          max={8}
          onChange={setPets}
        />
      </section>

      <section className="mt-[34px] border-y border-cream/10 bg-panel">
        <div className="mx-auto max-w-[720px] px-[18px] pt-6 pb-7 sm:px-10">
          <div className="text-[11px] tracking-chip text-sage-dim uppercase">
            Összefoglaló
          </div>

          <div className="mt-3.5 flex flex-col">
            <PriceRow label="Classic csomag" value={formatMoney(PKG_HUF)} />
            <PriceRow label="Stúdió bérlet" value={formatMoney(STUDIO_HUF)} />
            <PriceRow label="Fényjáték extra" value={formatMoney(LIGHT_HUF)} />
            {/* mindig látszanak — 0 Ft-tal, halványan, hogy ne ugorjon a layout */}
            <PriceRow
              label={
                extraHeads > 0
                  ? `Extra emberek · ${extraHeads} fő`
                  : 'Extra emberek'
              }
              value={formatMoney(headFee)}
              state={extraHeads > 0 ? 'accent' : 'idle'}
            />
            <PriceRow
              label={pets > 0 ? `Kisállat · ${pets} db` : 'Kisállat'}
              value={formatMoney(petFee)}
              state={pets > 0 ? 'accent' : 'idle'}
            />
          </div>

          <div className="mt-[18px] flex items-baseline justify-between gap-4">
            <span className="text-[15px] text-[#F1E7D5]">
              Várható végösszeg
            </span>
            <span className="text-[32px] leading-none whitespace-nowrap text-gold sm:text-[42px]">
              {formatMoney(total)}
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[720px] px-[18px] pt-[30px] sm:px-10">
        <div className="flex items-start gap-[13px] rounded-[18px] border border-gold/[.28] bg-gold/[.07] p-[18px]">
          <span className="mt-0.5 font-display text-xl leading-none text-gold">
            ✦
          </span>
          <span className="text-[15px] leading-[1.6] font-light text-pretty text-[#E7D9BE]">
            A következő lépésben{' '}
            <strong className="font-medium text-[#F1E7D5]">
              {formatMoney(DEPOSIT)} foglalót
            </strong>{' '}
            kell kifizetni — ezzel válik véglegessé az időpontod. A végleges
            összeget a fotózás napján, a stúdióban fizetitek — a foglaló ebből
            levonásra kerül.
          </span>
        </div>
        <div className="mt-3.5 text-[12.5px] leading-[1.6] text-pretty text-[#6E8478]">
          A fizetés biztonságos Stripe oldalon történik, bankkártya adataidat
          nem látjuk. A tovább gombbal elfogadod az{' '}
          <a href="#0">Általános Szerződési Feltételeket</a>.
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-cream/[.12] bg-[#0E2620]/[.95] px-4 pt-3.5 pb-[calc(14px+env(safe-area-inset-bottom))] backdrop-blur-xl sm:px-10">
        <div className="mx-auto flex max-w-[720px] items-center gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] tracking-[.16em] text-sage-dim uppercase">
              Foglaló most
            </span>
            <span className="text-[26px] leading-none text-cream">
              {formatMoney(DEPOSIT)}
            </span>
          </div>
          {/* TODO(Stripe): POST /api/checkout → redirect a checkout session URL-re. */}
          <button
            type="button"
            disabled={missingPeople}
            className={`ml-auto max-w-[280px] flex-1 rounded-full px-5 py-[17px] text-base font-medium transition-colors ${
              missingPeople
                ? 'cursor-not-allowed bg-cream/[.12] text-[#7C9083]'
                : 'bg-terracotta text-[#FFF4E6] shadow-[0_14px_32px_rgba(184,80,58,.3)] hover:bg-terracotta-hover'
            }`}
          >
            {missingPeople ? 'Add meg, hányan jöttök' : 'Fizetés →'}
          </button>
        </div>
      </div>
    </>
  );
}

function Stepper({
  label,
  ariaLabel,
  unit,
  hint,
  value,
  display,
  dim = false,
  min,
  max,
  onChange,
}: {
  label: React.ReactNode;
  ariaLabel: string;
  unit: string;
  hint: string;
  value: number;
  display: string;
  dim?: boolean;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  return (
    <>
      <div className="flex items-baseline gap-3">
        <span className="text-[17px] text-[#F1E7D5]">{label}</span>
        <span
          className={`ml-auto text-3xl leading-none font-semibold ${
            dim ? 'text-[#5F7568]' : 'text-gold'
          }`}
        >
          {display}
        </span>
        <span className="text-[13px] text-sage-dim">{unit}</span>
      </div>
      <div className="mt-1.5 text-[13.5px] leading-[1.5] text-sage-dim">
        {hint}
      </div>

      <div className="mt-[18px] flex items-center gap-3.5">
        <StepButton onClick={() => onChange(clamp(value - 1))}>−</StepButton>
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          aria-label={ariaLabel}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            backgroundImage: `linear-gradient(to right, #E5B77E 0%, #E5B77E ${pct}%, rgba(246,235,217,.14) ${pct}%, rgba(246,235,217,.14) 100%)`,
          }}
          className="range-slider h-11 flex-1 cursor-pointer touch-none appearance-none rounded-full bg-transparent bg-[length:100%_6px] bg-center bg-no-repeat outline-none"
        />
        <StepButton onClick={() => onChange(clamp(value + 1))}>+</StepButton>
      </div>
      <div className="mt-2 flex justify-between px-[42px] text-xs text-[#5F7568]">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </>
  );
}

function StepButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-11 w-11 flex-none rounded-full border border-cream/[.22] text-xl leading-none text-[#F1E7D5] transition-colors hover:border-cream/50"
    >
      {children}
    </button>
  );
}

function PriceRow({
  label,
  value,
  state = 'base',
}: {
  label: string;
  value: string;
  /** base = fix tétel, accent = aktív felár, idle = 0 Ft-os helyfoglaló */
  state?: 'base' | 'accent' | 'idle';
}) {
  const labelColor =
    state === 'accent'
      ? 'text-gold'
      : state === 'idle'
        ? 'text-[#5F7568]'
        : 'text-sage-soft';
  const valueColor = state === 'idle' ? 'text-[#5F7568]' : 'text-[#D8E2DA]';
  return (
    <div className="flex justify-between gap-4 border-b border-cream/[.08] py-3">
      <span className={`text-[14.5px] ${labelColor}`}>{label}</span>
      <span className={`text-[14.5px] whitespace-nowrap ${valueColor}`}>
        {value}
      </span>
    </div>
  );
}
