'use client';

import { useState } from 'react';

import { formatMoney } from '@/lib/utils';

const PKG_HUF = 49000_00;
const STUDIO_HUF = 9000_00;
const LIGHT_HUF = 15000_00;

const PER_HEAD = 5000_00;
const PER_PET = 5000_00;
const FREE_HEADS = 5;
const DEPOSIT = 10000_00;

export function BookingSummary() {
  const [people, setPeople] = useState(0);
  const [pets, setPets] = useState(0);
  const [note, setNote] = useState('');

  const extraHeads = Math.max(0, people - FREE_HEADS);
  const headFee = extraHeads * PER_HEAD;
  const petFee = pets * PER_PET;
  const total = PKG_HUF + STUDIO_HUF + LIGHT_HUF + headFee + petFee;
  const missingPeople = people === 0;

  return (
    <>
      <section className="border-b border-ink/12 bg-[#FCF5E8]">
        <div className="mx-auto max-w-180 px-4.5 pt-5.5 pb-7 sm:px-10">
          <div className="flex items-center gap-3">
            <span className="text-[11px] tracking-chip text-[#7B8C80] uppercase">
              A foglalásod
            </span>
          </div>

          <div className="mt-3.5 text-[26px] leading-[1.2] text-ink sm:text-[34px]">
            Szombat, december 13. · 11:30
          </div>
          <div className="mt-1.5 text-sm text-[#5C7064]">
            Karifoto stúdió · Budapest, Rózsa utca 12.
          </div>
        </div>
      </section>

      {/* <section className="mx-auto max-w-180 px-4.5 pt-[34px] pb-1 sm:px-10">
        <div className="text-[11px] tracking-chip text-[#7B8C80] uppercase">
          Még két kérdés
        </div>
        <h2 className="mt-2.5 font-display text-2xl leading-[1.2] font-medium text-ink sm:text-[32px]">
          Kik lesznek a képeken?
        </h2>
      </section> */}

      <section className="mx-auto max-w-180 px-4.5 pt-5.5 sm:px-10">
        <StepperLight
          label={
            <>
              Hányan jönnétek?<span className="ml-1 text-terracotta">*</span>
            </>
          }
          ariaLabel="Hányan jönnétek"
          unit="fő"
          // hint="Az 5 fő fölötti vendégekért 5 000 Ft / fő felárat számolunk."
          value={people}
          display={missingPeople ? '–' : String(people)}
          dim={missingPeople}
          min={0}
          max={8}
          onChange={setPeople}
        />
        {/* konstans banner — figyelmeztetésből visszajelzés lesz, nincs layout ugrás */}
        <div
          className={`mt-2.5 flex items-center gap-2.25 rounded-2xl border px-3.5 py-2.75 text-[13.5px] leading-[1.45] ${
            missingPeople
              ? 'border-terracotta/35 bg-terracotta/[.07] text-[#8F3A26]'
              : 'border-[#1D4B3C]/25 bg-[#1D4B3C]/6 text-[#2F5D45]'
          }`}
        >
          <span className="flex-none">{missingPeople ? '✱' : '✓'}</span>
          <span>
            {missingPeople
              ? 'Legalább 1 fő :)'
              : `Megvan! ${people === 1 ? 'egy' : people} főre készülünk.`}{' '}
            {people > 5 && `${formatMoney(PER_HEAD)}/extra fő`}
          </span>
        </div>
      </section>

      <section className="mx-auto max-w-180 px-4.5 pt-7.5 sm:px-10">
        <StepperLight
          label="Hoztok-e kisállatot?"
          ariaLabel="Hoztok-e kisállatot"
          unit="db"
          hint="Kutya, cica, nyuszi is jöhet — 5 000 Ft / kisállat."
          value={pets}
          display={String(pets)}
          min={0}
          max={8}
          onChange={setPets}
        />
      </section>
      <section className="mx-auto max-w-180 px-4.5 pt-7.5 sm:px-10">
        <label htmlFor="note" className="block text-[17px] text-ink">
          Megjegyzés
        </label>
        <div className="my-1.5 text-[13.5px] leading-normal text-[#5C7064]">
          Bármi, amit jó, ha tudunk: babakocsi, allergia, kedvenc pléd, ünnepi
          szett.
        </div>
        <textarea
          id="note"
          name="note"
          rows={4}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Írd ide a megjegyzésed…"
          className="w-full resize-none rounded-2xl border border-ink/18 bg-[#FFFDF8] px-4 py-3.5 text-[15px] leading-[1.55] text-ink outline-none placeholder:text-[#8C9A8F] focus:border-terracotta"
        />
        <div className="mt-1.5 text-right text-xs text-[#9AA89D]">
          {note.length} / 500
        </div>
      </section>

      <section className="mt-8.5 border-y border-ink/12 bg-[#FCF5E8]">
        <div className="mx-auto max-w-180 px-4.5 pt-6 pb-7 sm:px-10">
          <div className="text-[11px] tracking-chip text-[#7B8C80] uppercase">
            Összefoglaló
          </div>

          <div className="mt-3.5 flex flex-col">
            <PriceRowLight
              label="Classic csomag"
              value={formatMoney(PKG_HUF)}
            />
            <PriceRowLight
              label="Stúdió bérlet"
              value={formatMoney(STUDIO_HUF)}
            />
            <PriceRowLight
              label="Fényjáték extra"
              value={formatMoney(LIGHT_HUF)}
            />
            {/* mindig látszanak — 0 Ft-tal, halványan, hogy ne ugorjon a layout */}
            <PriceRowLight
              label={
                extraHeads > 0
                  ? `Extra emberek · ${extraHeads} fő`
                  : 'Extra emberek'
              }
              value={formatMoney(headFee)}
              state={extraHeads > 0 ? 'accent' : 'idle'}
            />
            <PriceRowLight
              label={pets > 0 ? `Kisállat · ${pets} db` : 'Kisállat'}
              value={formatMoney(petFee)}
              state={pets > 0 ? 'accent' : 'idle'}
            />
          </div>

          <div className="mt-4.5 flex items-baseline justify-between gap-4">
            <span className="text-[15px] text-ink">Várható végösszeg</span>
            <span className="text-[32px] leading-none whitespace-nowrap text-terracotta sm:text-[42px]">
              {formatMoney(total)}
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-180 px-4.5 pt-7.5 sm:px-10">
        <div className="flex items-start gap-3.25 rounded-[18px] border border-terracotta/26 bg-terracotta/6 p-4.5">
          <span className="mt-0.5 font-display text-xl leading-none text-terracotta">
            ✦
          </span>
          <span className="text-[15px] leading-[1.6] font-light text-pretty text-cream-muted">
            A következő lépésben{' '}
            <strong className="font-medium text-ink">
              {formatMoney(DEPOSIT)} foglalót
            </strong>{' '}
            kell kifizetni — ezzel válik véglegessé az időpontod. A végleges
            összeget a fotózás napján, a stúdióban fizetitek — a foglaló ebből
            levonásra kerül.
          </span>
        </div>
        <div className="mt-3.5 text-[12.5px] leading-[1.6] text-pretty text-[#7B8C80]">
          A fizetés biztonságos Stripe oldalon történik, bankkártya adataidat
          nem látjuk. A tovább gombbal elfogadod az{' '}
          <a href="#0">Általános Szerződési Feltételeket</a>.
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-ink/20 bg-forest/97 px-4 pt-3.5 pb-[calc(14px+env(safe-area-inset-bottom))] shadow-[0_-12px_32px_rgba(20,51,42,.16)] backdrop-blur-xl sm:px-10">
        <div className="mx-auto flex max-w-180 items-center gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] tracking-[.16em] text-sage-dim uppercase">
              Foglaló
            </span>
            <span className="text-[26px] leading-none text-cream">
              {formatMoney(DEPOSIT)}
            </span>
          </div>
          {/* TODO(Stripe): POST /api/checkout → redirect a checkout session URL-re. */}
          <button
            type="button"
            disabled={missingPeople}
            className={`ml-auto max-w-70 flex-1 rounded-full px-5 py-4.25 text-base font-medium transition-colors ${
              missingPeople
                ? 'cursor-not-allowed bg-cream/12 text-[#7C9083]'
                : 'bg-terracotta text-[#FFF4E6] shadow-[0_14px_32px_rgba(184,80,58,.3)] hover:bg-terracotta-hover'
            }`}
          >
            {missingPeople ? 'Add meg, hányan jöttök' : 'Foglaló fizetése →'}
          </button>
        </div>
      </div>
    </>
  );
}

function StepperLight({
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
  hint?: string;
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
        <span className="text-[17px] text-ink">{label}</span>
        <span
          className={`ml-auto text-3xl leading-none ${
            dim ? 'text-[#9AA89D]' : 'text-[#A2612F]'
          }`}
        >
          {display}
        </span>
        <span className="text-[13px] text-[#7B8C80]">{unit}</span>
      </div>
      {hint && (
        <div className="mt-1.5 text-[13.5px] leading-normal text-[#5C7064]">
          {hint}
        </div>
      )}

      <div className="mt-4.5 flex items-center gap-3.5">
        <StepButtonLight onClick={() => onChange(clamp(value - 1))}>
          −
        </StepButtonLight>
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          aria-label={ariaLabel}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            backgroundImage: `linear-gradient(to right, #B8503A 0%, #B8503A ${pct}%, rgba(20,51,42,.14) ${pct}%, rgba(20,51,42,.14) 100%)`,
          }}
          className="range-slider-light h-11 flex-1 cursor-pointer touch-none appearance-none rounded-full bg-transparent bg-size-[100%_6px] bg-center bg-no-repeat outline-none"
        />
        <StepButtonLight onClick={() => onChange(clamp(value + 1))}>
          +
        </StepButtonLight>
      </div>
      <div className="mt-2 flex justify-between px-10.5 text-xs text-[#8C9A8F]">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </>
  );
}

function StepButtonLight({
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
      className="h-11 w-11 flex-none rounded-full border border-ink/22 text-xl leading-none text-ink transition-colors hover:border-ink/50"
    >
      {children}
    </button>
  );
}

function PriceRowLight({
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
      ? 'text-[#A2612F]'
      : state === 'idle'
        ? 'text-[#9AA89D]'
        : 'text-[#41564A]';
  const valueColor = state === 'idle' ? 'text-[#9AA89D]' : 'text-ink';
  return (
    <div className="flex justify-between gap-4 border-b border-ink/10 py-3">
      <span className={`text-[14.5px] ${labelColor}`}>{label}</span>
      <span className={`text-[14.5px] whitespace-nowrap ${valueColor}`}>
        {value}
      </span>
    </div>
  );
}
