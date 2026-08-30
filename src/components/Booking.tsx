'use client';

import { useAppContext } from '@/components/AppContextProvider';
import { DaysAndTimes } from '@/components/DaysAndTimes';
import { Step } from '@/components/Step';
import { LIGHT_PLAY_FEE } from '@/lib/constants';
import { packages } from '@/lib/data';
import { shortFullDateFormatter } from '@/lib/formatters';
import { cn, formatMoney, GroupedSlots } from '@/lib/utils';

export function Booking({
  groupedTimeSlots,
}: {
  groupedTimeSlots: GroupedSlots;
}) {
  return (
    <section
      id="foglalas"
      className="border-t border-cream/9 bg-[linear-gradient(180deg,#0E2620,#122E26)] px-4.5 py-14 sm:px-7 sm:py-22"
    >
      <div className="mx-auto max-w-270">
        <div className="text-center">
          <div className="eyebrow">Foglalás · 30 másodperc</div>
          <h2 className="mt-3.5 font-display text-[32px] font-medium text-cream-strong sm:text-[52px]">
            Válassz időpontot
          </h2>
          <p className="mx-auto mt-3.5 max-w-130 text-base font-light text-sage-soft">
            A visszaigazolást e-mailben fogjuk elküldeni.
          </p>
        </div>
        <Form groupedTimeSlots={groupedTimeSlots} />
      </div>
    </section>
  );
}

function Form({ groupedTimeSlots }: { groupedTimeSlots: GroupedSlots }) {
  const ctx = useAppContext();

  return (
    <div className="mt-7 grid grid-cols-1 gap-6 rounded-[22px] bg-cream p-5 text-ink sm:mt-11 sm:p-8.5 lg:grid-cols-[1.35fr_1fr] lg:gap-8.5">
      <div>
        <Step n={1} label="Csomag" />
        <div className="mt-3 flex flex-wrap gap-2.5">
          {packages.map(({ id, name }) => (
            <button
              key={id}
              type="button"
              onClick={() => ctx.selectPackage(id)}
              className={cn(
                'rounded-full border border-ink/20 px-4.5 py-3 text-sm text-ink transition-colors hover:border-ink/50',
                ctx.selectedPackageKey === id && 'border-ink bg-ink text-cream',
              )}
            >
              {name}
            </button>
          ))}
        </div>

        <Step n={2} label="Díszlet" className="mt-7" />
        <div className="mt-1.75 text-[13px] text-[#4A5F53]">
          {ctx.bothDecorSets
            ? `A ${ctx.selectedPackage.name} csomagban mindkét díszlettel fotózunk.`
            : 'A Mini csomagban egy díszletet választhatsz.'}
        </div>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {ctx.decorSets.map(({ key, name, selected, disabled }) => {
            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => ctx.selectDecorSet(key)}
                className={cn(
                  'rounded-full border border-ink/20 px-4.5 py-3 text-sm text-ink transition-colors hover:border-ink/50 disabled:cursor-default disabled:opacity-[.82]',
                  selected && 'border-ink bg-ink text-cream',
                )}
              >
                {name}
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
            disabled={ctx.isLightPlayIncluded}
            onClick={ctx.toggleLightPlay}
            className={cn(
              'mt-3 flex items-center gap-3.25 rounded-2xl border border-dashed border-ink/[.28] px-4.5 py-3.5 text-left text-ink transition-colors hover:border-ink/50 disabled:cursor-default disabled:opacity-[.85]',
              ctx.isLightPlayOn && 'border-solid border-ink bg-ink text-cream',
            )}
          >
            <span
              className={cn(
                'inline-flex h-6 w-6 flex-none items-center justify-center rounded-full border border-ink/30 text-[13px]',
                ctx.isLightPlayOn && 'border-cream/40',
              )}
            >
              {ctx.isLightPlayOn ? '✓' : '+'}
            </span>
            <span className="flex flex-col gap-0.75">
              <span className="text-[15px] font-medium">Fényjáték</span>
              <span className="text-[12.5px] leading-[1.4] opacity-[.72]">
                {ctx.isLightPlayIncluded
                  ? 'A Family csomag tartalmazza'
                  : `+ ${formatMoney(LIGHT_PLAY_FEE)}`}
              </span>
            </span>
          </button>
        </div>
        <DaysAndTimes groupedTimeSlots={groupedTimeSlots} />
      </div>

      <div className="flex flex-col rounded-[18px] bg-ink p-5 text-[#F1E7D5] sm:p-6.5">
        <div className="text-[11px] tracking-chip text-sage-dim uppercase">
          Foglalás összegzése
        </div>
        <div className="mt-3 text-[28px] leading-tight text-cream-strong">
          {ctx.selectedTimeSlot != null
            ? `${shortFullDateFormatter.format(ctx.selectedTimeSlot.startTime)}`
            : 'Válassz napot és idősávot'}
        </div>
        <div className="mt-2 text-sm text-sage-soft">
          {ctx.selectedPackage.name} csomag · {ctx.selectedPackage.sub}
        </div>
        <div className="mt-1 text-sm text-gold">{ctx.decorSetLabel}</div>

        <div className="mt-4.5 flex flex-col gap-1.75 border-t border-cream/[.14] pt-4">
          <Row
            label={`${ctx.selectedPackage.name} csomag`}
            value={formatMoney(ctx.selectedPackage.priceHuf)}
          />
          <Row
            label="Stúdió bérlet"
            value={formatMoney(ctx.selectedPackage.studioFeeHuf)}
          />
          {ctx.isLightPlayIncluded ? (
            <Row label="Fényjáték extra" value="a csomag része" />
          ) : ctx.isLightPlayOn ? (
            <Row label="Fényjáték extra" value={formatMoney(LIGHT_PLAY_FEE)} />
          ) : null}
          <div className="mt-1.5 flex items-baseline justify-between gap-3.5 border-t border-cream/[.14] pt-3">
            <span className="text-sm text-[#F1E7D5]">Várható végösszeg</span>
            <span className="font-display text-[28px] leading-none whitespace-nowrap text-gold">
              {formatMoney(ctx.estimatedTotalAmount)}
            </span>
          </div>
        </div>

        <div className="mt-5.5 flex flex-col gap-2.5">
          <input
            value={ctx.name}
            onChange={(e) => ctx.setName(e.target.value)}
            placeholder="Teljes neved"
            autoComplete="name"
            className="rounded-xl border border-cream/18 bg-forest px-3.75 py-3.5 text-[#F1E7D5] outline-none placeholder:text-sage-dim focus:border-gold"
          />
          <input
            value={ctx.email}
            onChange={(e) => ctx.setEmail(e.target.value)}
            placeholder="E-mail címed"
            type="email"
            autoComplete="email"
            className="rounded-xl border border-cream/18 bg-forest px-3.75 py-3.5 text-[#F1E7D5] outline-none placeholder:text-sage-dim focus:border-gold"
          />
        </div>

        <button
          type="button"
          onClick={ctx.confirm}
          disabled={!ctx.canConfirm}
          className={`mt-4.5 rounded-full px-5 py-4.5 text-base font-medium transition-colors ${
            ctx.canConfirm
              ? 'bg-terracotta text-[#FFF4E6] hover:bg-terracotta-hover'
              : 'cursor-not-allowed bg-cream/[.14] text-sage-dim'
          }`}
        >
          {ctx.canConfirm
            ? 'Tovább'
            : ctx.selectedTimeSlotId
              ? 'Add meg a neved és e-mailed'
              : 'Válassz idősávot'}
        </button>

        <div className="mt-3 text-xs leading-normal text-sage-dim">
          A következő oldalon még pár szükséges adatot elkérünk a foglaláshoz.
        </div>
      </div>
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
