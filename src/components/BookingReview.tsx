'use client';

import { useActionState } from 'react';

import { Package } from '@/generated/prisma/enums';
import {
  APP_URLS,
  DEPOSIT_AMOUNT,
  EXTRA_FEE_PER_EXTRA_PERSON,
  EXTRA_FEE_PER_PET,
  isLightPlayChargeable,
  LIGHT_PLAY_FEE,
  PACKAGE_PRICES,
  PERSONS_INCLUDED,
  PRICE_ADJUSTMENT_TYPE_SIGN,
} from '@/lib/constants';
import { packages, type PackageKey } from '@/lib/data';
import { formatSlotDateTime } from '@/lib/formatters';
import { cn, formatMoney } from '@/lib/utils';
import { createCheckoutSession } from '@/server/stripe';

import type { BookingIntentPublic } from '@/lib/queries';

const packageNameById = Object.fromEntries(
  packages.map((p) => [p.id, p.name]),
) as Record<PackageKey, string>;

const PACKAGE_LABEL: Record<Package, string> = {
  [Package.MINI]: packageNameById.mini,
  [Package.CLASSIC]: packageNameById.classic,
  [Package.FAMILY]: packageNameById.family,
};

export function BookingReview({
  bookingIntent,
}: {
  bookingIntent: BookingIntentPublic;
}) {
  const [state, formAction, isPending] = useActionState(
    createCheckoutSession.bind(null, bookingIntent.id),
    undefined,
  );

  const { base: packageBasePrice, studio: packageStudioFee } =
    PACKAGE_PRICES[bookingIntent.package];

  const shouldShowLight = isLightPlayChargeable(bookingIntent.package);
  const lightFee =
    shouldShowLight && bookingIntent.isLightPlaySelected ? LIGHT_PLAY_FEE : 0;

  const extraHeads = Math.max(
    0,
    bookingIntent.numberOfGuests - PERSONS_INCLUDED,
  );
  const headFee = extraHeads * EXTRA_FEE_PER_EXTRA_PERSON;
  const petFee = bookingIntent.numberOfPets * EXTRA_FEE_PER_PET;

  const totalAdjustments = bookingIntent.adjustments.reduce((sum, adj) => {
    return sum + adj.amountInCents * PRICE_ADJUSTMENT_TYPE_SIGN[adj.type];
  }, 0);
  const total =
    packageBasePrice +
    packageStudioFee +
    lightFee +
    headFee +
    petFee +
    totalAdjustments;

  return (
    <form action={formAction}>
      <section className="bg-white/45 sm:rounded-t-[28px]">
        <div className="mx-auto max-w-130 px-4.5 pt-6 pb-7 sm:px-10">
          <div className="eyebrow-ink">Összefoglaló</div>

          <div className="mt-3.5 flex flex-col">
            <div className="flex justify-between gap-4 border-b border-ink/10 py-3">
              <span className="text-lg font-bold text-ink">Időpont</span>
              <span className="text-right text-lg font-medium text-ink">
                {formatSlotDateTime(bookingIntent.requestedStartTime)}
              </span>
            </div>
            <PriceRow
              label={`${PACKAGE_LABEL[bookingIntent.package]} csomag`}
              value={formatMoney(packageBasePrice)}
            />
            <PriceRow
              label="Stúdió bérlet"
              value={formatMoney(packageStudioFee)}
            />
            {shouldShowLight && (
              <PriceRow
                label="Fényjáték extra"
                value={formatMoney(lightFee)}
                state={bookingIntent.isLightPlaySelected ? 'base' : 'idle'}
              />
            )}
            {extraHeads > 0 && (
              <PriceRow
                label={`Extra emberek · ${extraHeads} fő`}
                value={formatMoney(headFee)}
                state="accent"
              />
            )}
            {bookingIntent.numberOfPets > 0 && (
              <PriceRow
                label={`Kisállat · ${bookingIntent.numberOfPets} db`}
                value={formatMoney(petFee)}
                state="accent"
              />
            )}
            {bookingIntent.adjustments.map(
              ({ id, publicLabel, amountInCents, type }) => {
                return (
                  <PriceRow
                    key={id}
                    label={publicLabel}
                    value={formatMoney(
                      amountInCents * PRICE_ADJUSTMENT_TYPE_SIGN[type],
                    )}
                    state="discount"
                  />
                );
              },
            )}
          </div>

          <div className="mt-4.5 flex items-baseline justify-between gap-4">
            <span className="text-muted-foreground">Összesen</span>
            <span className="text-lg leading-none whitespace-nowrap text-muted-foreground sm:text-xl">
              {formatMoney(total)}
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-130 px-4.5 py-7.5 sm:px-10">
        <div className="flex items-start gap-3.25 rounded-[18px] border border-brand-free-edge/75 bg-brand-free-surface/60 p-4.5">
          <span className="mt-0.5 font-display text-xl leading-none text-brand-free-edge">
            ✦
          </span>
          <div>
            <span className="text-[15px] leading-[1.6] font-light text-pretty text-cream-muted">
              A következő lépésben{' '}
              <strong className="font-medium text-ink">
                {formatMoney(DEPOSIT_AMOUNT)} előleget
              </strong>{' '}
              kérünk, ennek megfizetésével válik véglegessé a foglalásotok. A
              fennmaradó összeget a fotózáskor készpénzben, vagy kártyával
              tudjátok rendezni.
            </span>
            <p className="mt-2 text-sm">
              Betegség esetén felár nélkül találunk Nektek másik időpontot
              &#9825;
            </p>
          </div>
        </div>
        <div className="mt-3.5 text-[12.5px] leading-[1.6] text-pretty text-muted-foreground">
          A fizetés biztonságos Stripe oldalon történik, bankkártya adataidat
          nem látjuk. A fizetés gombbal elfogadod az{' '}
          <a href={APP_URLS.terms} target="_blank" rel="noopener norefferer">
            Általános Szerződési Feltételeket
          </a>
          .
        </div>
      </section>

      {/* A createCheckoutSession FormData-ból olvas; az értékek a foglalásból jönnek. */}
      <input
        type="hidden"
        name="numberOfGuests"
        value={bookingIntent.numberOfGuests}
      />
      <input
        type="hidden"
        name="numberOfPets"
        value={bookingIntent.numberOfPets}
      />
      <input
        type="hidden"
        name="clientNote"
        value={bookingIntent.clientNote ?? ''}
      />

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-cream/15 bg-forest/78 px-4 pt-3.5 pb-[calc(14px+env(safe-area-inset-bottom))] shadow-[0_-12px_32px_rgba(20,51,42,.16)] backdrop-blur-xl sm:px-10">
        <div className="mx-auto flex max-w-180 items-center gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] tracking-[.16em] text-sage-dim uppercase">
              Előleg
            </span>
            <span className="text-[26px] leading-none text-cream">
              {formatMoney(DEPOSIT_AMOUNT)}
            </span>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className={`ml-auto max-w-70 flex-1 rounded-full px-5 py-4.25 text-base font-medium transition-colors ${
              isPending
                ? 'cursor-not-allowed bg-[#a67f4a]'
                : 'bg-brand-champagne shadow-[0_14px_32px_rgba(184,80,58,.3)] hover:bg-brand-champagne-hover'
            }`}
          >
            {isPending ? 'Átirányítás…' : 'Tovább →'}
          </button>
        </div>
        {state?.error && (
          <div className="mx-auto mt-2.5 max-w-180 text-[13px] text-terracotta">
            {state.error}
          </div>
        )}
      </div>
    </form>
  );
}

function PriceRow({
  label,
  value,
  state = 'base',
}: {
  label: string;
  value: string;
  state?: 'base' | 'accent' | 'idle' | 'discount';
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-ink/10 py-3">
      <span
        className={cn(
          'text-[14.5px] text-cream-muted',
          state === 'accent' && 'text-[#A2612F]',
          state === 'idle' && 'text-[#9AA89D]',
          state === 'discount' && 'text-green-600',
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'text-[14.5px] whitespace-nowrap text-ink',
          state === 'accent' && 'text-[#A2612F]',
          state === 'idle' && 'text-[#9AA89D]',
          state === 'discount' && 'text-green-600',
        )}
      >
        {value}
      </span>
    </div>
  );
}
