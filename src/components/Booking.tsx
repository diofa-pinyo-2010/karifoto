'use client';

import { useBooking } from '@/components/BookingProvider';
import { LIGHT_PLAY_FEE, baseSetNames, days, huf, packages } from '@/lib/data';

export function Booking() {
  const booking = useBooking();

  return (
    <section
      id="foglalas"
      className="border-t border-cream/[.09] bg-[linear-gradient(180deg,#0E2620,#122E26)] px-[18px] py-14 sm:px-7 sm:py-[88px]"
    >
      <div className="mx-auto max-w-[1080px]">
        <div className="text-center">
          <div className="eyebrow">Foglalás · 30 másodperc</div>
          <h2 className="mt-3.5 font-display text-[32px] font-medium text-cream-strong sm:text-[52px]">
            Válassz időpontot
          </h2>
          <p className="mx-auto mt-3.5 max-w-[520px] text-base font-light text-sage-soft">
            Előre fizetés nincs. A visszaigazolást e-mailben kapod, és 48 órán
            belül díjmentesen módosítható.
          </p>
        </div>

        {booking.confirmed ? <Confirmation /> : <Form />}
      </div>
    </section>
  );
}

function Form() {
  const booking = useBooking();

  return (
    <div className="mt-7 grid grid-cols-1 gap-6 rounded-[22px] bg-cream p-5 text-ink sm:mt-11 sm:p-[34px] lg:grid-cols-[1.35fr_1fr] lg:gap-[34px]">
      <div>
        <Step n={1} label="Csomag" />
        <div className="mt-3 flex flex-wrap gap-2.5">
          {packages.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => booking.selectPackage(i)}
              className={`rounded-full border px-[18px] py-3 text-sm transition-colors ${
                i === booking.pkgIndex
                  ? 'border-ink bg-ink text-cream'
                  : 'border-ink/20 text-ink hover:border-ink/50'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        <Step n={2} label="Díszlet" className="mt-7" />
        <div className="mt-[7px] text-[13px] text-[#4A5F53]">
          {booking.bothSets
            ? `A ${booking.pkg.name} csomagban mindkét díszlettel fotózunk.`
            : 'A Mini csomagban egy díszletet választhatsz.'}
        </div>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {baseSetNames.map((label, i) => {
            const on = booking.bothSets || i === booking.setIndex;
            return (
              <button
                key={label}
                type="button"
                disabled={booking.bothSets}
                onClick={() => booking.selectSet(i)}
                className={`rounded-full border px-[18px] py-3 text-sm transition-colors disabled:cursor-default disabled:opacity-[.82] ${
                  on
                    ? 'border-ink bg-ink text-cream'
                    : 'border-ink/20 text-ink hover:border-ink/50'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="mt-3.5 border-t border-dashed border-ink/20 pt-4">
          <div className="text-[11px] tracking-chip text-[#7B8C80] uppercase">
            Extra
          </div>
          <button
            type="button"
            disabled={booking.lightIncluded}
            onClick={booking.toggleLight}
            className={`mt-3 flex items-center gap-[13px] rounded-2xl border px-[18px] py-3.5 text-left transition-colors disabled:cursor-default disabled:opacity-[.85] ${
              booking.lightOn
                ? 'border-solid border-ink bg-ink text-cream'
                : 'border-dashed border-ink/[.28] text-ink hover:border-ink/50'
            }`}
          >
            <span
              className={`inline-flex h-6 w-6 flex-none items-center justify-center rounded-full border text-[13px] ${
                booking.lightOn ? 'border-cream/40' : 'border-ink/30'
              }`}
            >
              {booking.lightOn ? '✓' : '+'}
            </span>
            <span className="flex flex-col gap-[3px]">
              <span className="text-[15px] font-medium">Fényjáték</span>
              <span className="text-[12.5px] leading-[1.4] opacity-[.72]">
                {booking.lightIncluded
                  ? 'A Family csomag tartalmazza'
                  : `+ ${huf(LIGHT_PLAY_FEE)}`}
              </span>
            </span>
          </button>
        </div>

        <Step n={3} label="Nap" className="mt-7" />
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {days.map((d, i) => {
            const full = d.slots.length === 0;
            const active = i === booking.dayIndex;
            return (
              <button
                key={d.id}
                type="button"
                disabled={full}
                onClick={() => booking.selectDay(i)}
                className={`rounded-2xl border px-4 py-3.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  active
                    ? 'border-ink bg-ink text-cream'
                    : 'border-ink/[.18] bg-ink/[.04] text-ink'
                }`}
              >
                <span className="block text-[11px] tracking-[.16em] uppercase opacity-70">
                  {d.weekday}
                </span>
                <span className="mt-0.5 block font-display text-2xl">
                  {d.label}
                </span>
                <span className="mt-[3px] block text-[11px] opacity-75">
                  {d.note}
                </span>
              </button>
            );
          })}
        </div>

        <Step n={4} label="Idősáv" className="mt-7" />
        <div className="mt-3 flex flex-wrap gap-2.5">
          {booking.day.slots.length === 0 ? (
            <span className="rounded-[14px] border border-dashed border-ink/25 px-[22px] py-3.5 text-[15px] text-cream-dim">
              Ezen a napon nincs szabad hely
            </span>
          ) : (
            booking.day.slots.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => booking.selectSlot(t)}
                className={`rounded-[14px] border px-[22px] py-3.5 text-[15px] transition-colors ${
                  booking.slot === t
                    ? 'border-terracotta bg-terracotta text-[#FFF4E6]'
                    : 'border-ink/20 text-ink hover:border-ink/50'
                }`}
              >
                {t}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col rounded-[18px] bg-ink p-5 text-[#F1E7D5] sm:p-[26px]">
        <div className="text-[11px] tracking-chip text-sage-dim uppercase">
          Foglalás összegzése
        </div>
        <div className="mt-3 font-display text-[28px] leading-[1.25] text-cream-strong">
          {booking.slot
            ? `${booking.day.weekday}, ${booking.day.label} ${booking.slot}`
            : 'Válassz napot és idősávot'}
        </div>
        <div className="mt-2 text-sm text-sage-soft">
          {booking.pkg.name} csomag · {booking.pkg.sub}
        </div>
        <div className="mt-1 text-sm text-gold">{booking.setLabel}</div>

        <div className="mt-[18px] flex flex-col gap-[7px] border-t border-cream/[.14] pt-4">
          <Row
            label={`${booking.pkg.name} csomag`}
            value={huf(booking.pkg.priceHuf)}
          />
          <Row label="Stúdió bérlet" value={huf(booking.pkg.studioFeeHuf)} />
          {booking.lightIncluded ? (
            <Row label="Fényjáték extra" value="a csomag része" />
          ) : booking.light ? (
            <Row label="Fényjáték extra" value={huf(LIGHT_PLAY_FEE)} />
          ) : null}
          <div className="mt-1.5 flex items-baseline justify-between gap-3.5 border-t border-cream/[.14] pt-3">
            <span className="text-sm text-[#F1E7D5]">Fizetendő összesen</span>
            <span className="font-display text-[28px] leading-none whitespace-nowrap text-gold">
              {huf(booking.totalHuf)}
            </span>
          </div>
        </div>

        <div className="mt-[22px] flex flex-col gap-2.5">
          <input
            value={booking.name}
            onChange={(e) => booking.setName(e.target.value)}
            placeholder="Neved"
            autoComplete="name"
            className="rounded-xl border border-cream/[.18] bg-forest px-[15px] py-3.5 text-[#F1E7D5] outline-none placeholder:text-sage-dim focus:border-gold"
          />
          <input
            value={booking.email}
            onChange={(e) => booking.setEmail(e.target.value)}
            placeholder="E-mail cím"
            type="email"
            autoComplete="email"
            className="rounded-xl border border-cream/[.18] bg-forest px-[15px] py-3.5 text-[#F1E7D5] outline-none placeholder:text-sage-dim focus:border-gold"
          />
        </div>

        <button
          type="button"
          onClick={booking.confirm}
          disabled={!booking.canConfirm}
          className={`mt-[18px] rounded-full px-5 py-[18px] text-base font-medium transition-colors ${
            booking.canConfirm
              ? 'bg-terracotta text-[#FFF4E6] hover:bg-terracotta-hover'
              : 'cursor-not-allowed bg-cream/[.14] text-sage-dim'
          }`}
        >
          {booking.canConfirm
            ? 'Tovább'
            : booking.slot
              ? 'Add meg a neved és e-mailed'
              : 'Válassz idősávot'}
        </button>

        <div className="mt-3 text-xs leading-[1.5] text-sage-dim">
          A következő oldalon még pár szükséges adatot elkérünk a foglaláshoz.
        </div>
      </div>
    </div>
  );
}

function Confirmation() {
  const booking = useBooking();

  return (
    <div className="mt-7 rounded-[22px] bg-cream px-5 py-9 text-center text-ink sm:mt-11 sm:px-[34px] sm:py-14">
      <div className="font-display text-[30px] text-ink sm:text-[44px]">
        Megvan az időpontod
      </div>
      <div className="mt-3 text-[18px] text-cream-muted">
        {booking.day.weekday}, {booking.day.label} {booking.slot} —{' '}
        {booking.pkg.name} csomag · {huf(booking.totalHuf)}
      </div>
      <div className="mt-1.5 text-base text-cream-dim">
        {booking.setLabel}
        {booking.lightOn ? ' + Fényjáték' : ''}
      </div>
      <div className="mt-[18px] text-[15px] text-cream-dim">
        A visszaigazolást elküldtük ide: {booking.email}
      </div>
      <button
        type="button"
        onClick={booking.reset}
        className="mt-[26px] rounded-full border border-ink/30 px-[26px] py-3.5 text-[15px] text-ink transition-colors hover:bg-ink/5"
      >
        Másik időpontot választok
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3.5 text-sm text-sage-soft">
      <span>{label}</span>
      <span className="whitespace-nowrap text-[#D8E2DA]">{value}</span>
    </div>
  );
}

function Step({
  n,
  label,
  className = '',
}: {
  n: number;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`text-[11px] tracking-chip text-[#7B8C80] uppercase ${className}`}
    >
      {n} · {label}
    </div>
  );
}
