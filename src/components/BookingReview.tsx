'use client';

import { useActionState } from 'react';

import { Package } from '@/generated/prisma/enums';
import {
  DEPOSIT_AMOUNT,
  EXTRA_FEE_PER_EXTRA_PERSON,
  EXTRA_FEE_PER_PET,
  LIGHT_PLAY_FEE,
  PACKAGE_PRICES,
  PERSONS_INCLUDED,
} from '@/lib/constants';
import { packages, type PackageKey } from '@/lib/data';
import { formatSlotDateTime } from '@/lib/formatters';
import { formatMoney } from '@/lib/utils';
import { BookingIntentWithTimeSlot } from '@/server/booking-intent';
import { createCheckoutSession } from '@/server/stripe';

const packageNameById = Object.fromEntries(
  packages.map((p) => [p.id, p.name]),
) as Record<PackageKey, string>;

const PACKAGE_LABEL: Record<Package, string> = {
  [Package.MINI]: packageNameById.mini,
  [Package.CLASSIC]: packageNameById.classic,
  [Package.FAMILY]: packageNameById.family,
};

// const DECOR_SET_LABEL: Record<DecorSet, string> = {
//   [DecorSet.HOFEHER]: photoShootingSets.hofeher.name,
//   [DecorSet.ALOMKASTELY]: photoShootingSets.alomkastely.name,
// };

export function BookingReview({
  bookingIntent,
}: {
  bookingIntent: BookingIntentWithTimeSlot;
}) {
  const [state, formAction, isPending] = useActionState(
    createCheckoutSession.bind(null, bookingIntent.id),
    undefined,
  );

  const { base: packageBasePrice, studio: packageStudioFee } =
    PACKAGE_PRICES[bookingIntent.package];

  const shouldShowLight = bookingIntent.package !== Package.FAMILY;
  const lightFee =
    shouldShowLight && bookingIntent.isLightPlaySelected ? LIGHT_PLAY_FEE : 0;

  const extraHeads = Math.max(
    0,
    bookingIntent.numberOfGuests - PERSONS_INCLUDED,
  );
  const headFee = extraHeads * EXTRA_FEE_PER_EXTRA_PERSON;
  const petFee = bookingIntent.numberOfPets * EXTRA_FEE_PER_PET;
  const total =
    packageBasePrice + packageStudioFee + lightFee + headFee + petFee;

  return (
    <form action={formAction}>
      {/* <section className="border-b border-ink/12 bg-[#FCF5E8]">
        <div className="mx-auto max-w-130 px-4.5 pt-5.5 pb-7 sm:px-10">
          <div className="eyebrow">A foglalásod</div>
          <div className="mt-3.5 text-[26px] leading-[1.2] text-ink sm:text-[34px]">
            {formatLongDate(bookingIntent.timeSlot.startTime)}
          </div>
        </div>
      </section> */}

      {/* <section className="mx-auto max-w-130 px-4.5 pt-7.5 sm:px-10">
        <h2 className="font-display text-2xl font-medium text-ink">
          Amit lefoglaltál
        </h2>
        <dl className="mt-3.5 flex flex-col">
          <ReviewRow
            label="Csomag"
            value={PACKAGE_LABEL[bookingIntent.package]}
          />
          <ReviewRow
            label="Díszlet"
            value={
              bookingIntent.decorSet == null
                ? 'Mindkét díszlet'
                : DECOR_SET_LABEL[bookingIntent.decorSet]
            }
          />
          <ReviewRow
            label="Fényjáték"
            value={
              shouldShowLight
                ? bookingIntent.isLightPlaySelected
                  ? 'Igen'
                  : 'Nem'
                : 'A csomag része'
            }
          />
          <ReviewRow
            label="Létszám"
            value={`${bookingIntent.numberOfGuests} fő`}
          />
          <ReviewRow
            label="Kisállat"
            value={
              bookingIntent.numberOfPets === 0
                ? 'Nem hozunk'
                : `${bookingIntent.numberOfPets} db`
            }
          />
          <ReviewRow label="Név" value={bookingIntent.name} />
          <ReviewRow label="E-mail" value={bookingIntent.email} />
          {bookingIntent.clientNote && (
            <ReviewRow label="Megjegyzés" value={bookingIntent.clientNote} />
          )}
        </dl>

        <Link
          href="/"
          className="mt-4 inline-block text-[13.5px] text-cream-muted underline underline-offset-4 transition-opacity hover:opacity-70"
        >
          Módosítanál? Kezdd újra a főoldalról.
        </Link>
      </section> */}

      <section className="bg-[#FCF5E8]">
        <div className="mx-auto max-w-130 px-4.5 pt-6 pb-7 sm:px-10">
          <div className="eyebrow">Összefoglaló</div>

          <div className="mt-3.5 flex flex-col">
            <div className="flex justify-between gap-4 border-b border-ink/10 py-3">
              <span className="text-[14.5px] font-bold text-ink">Időpont</span>
              <span className="text-right text-[14.5px] font-medium text-ink">
                {formatSlotDateTime(bookingIntent.timeSlot.startTime)}
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
              label={
                bookingIntent.numberOfPets > 0
                  ? `Kisállat · ${bookingIntent.numberOfPets} db`
                  : 'Kisállat'
              }
              value={formatMoney(petFee)}
              state={bookingIntent.numberOfPets > 0 ? 'accent' : 'idle'}
            />
          </div>

          <div className="mt-4.5 flex items-baseline justify-between gap-4">
            <span className="text-[15px] text-ink">Összesen</span>
            <span className="text-[32px] leading-none whitespace-nowrap text-terracotta sm:text-[42px]">
              {formatMoney(total)}
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-130 px-4.5 pt-7.5 sm:px-10">
        <div className="flex items-start gap-3.25 rounded-[18px] border border-terracotta/26 bg-terracotta/6 p-4.5">
          <span className="mt-0.5 font-display text-xl leading-none text-terracotta">
            ✦
          </span>
          <span className="text-[15px] leading-[1.6] font-light text-pretty text-cream-muted">
            A következő lépésben{' '}
            <strong className="font-medium text-ink">
              {formatMoney(DEPOSIT_AMOUNT)} foglalót
            </strong>{' '}
            kell kifizetni — ezzel válik véglegessé a foglalás. A végleges
            összeget a fotózás napján, a stúdióban fizetitek — a foglaló ebből
            levonásra kerül.
          </span>
        </div>
        <div className="mt-3.5 text-[12.5px] leading-[1.6] text-pretty text-[#7B8C80]">
          A fizetés biztonságos Stripe oldalon történik, bankkártya adataidat
          nem látjuk. A fizetés gombbal elfogadod az{' '}
          <a href="#0">Általános Szerződési Feltételeket</a>.
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

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-ink/20 bg-forest/97 px-4 pt-3.5 pb-[calc(14px+env(safe-area-inset-bottom))] shadow-[0_-12px_32px_rgba(20,51,42,.16)] backdrop-blur-xl sm:px-10">
        <div className="mx-auto flex max-w-180 items-center gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] tracking-[.16em] text-sage-dim uppercase">
              Foglaló
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
                ? 'cursor-not-allowed bg-cream/12 text-[#7C9083]'
                : 'bg-terracotta text-[#FFF4E6] shadow-[0_14px_32px_rgba(184,80,58,.3)] hover:bg-terracotta-hover'
            }`}
          >
            {isPending ? 'Feldolgozás…' : 'Fizetés →'}
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

// function ReviewRow({ label, value }: { label: string; value: string }) {
//   return (
//     <div className="flex justify-between gap-6 border-b border-ink/10 py-3">
//       <dt className="text-[14.5px] text-cream-muted">{label}</dt>
//       <dd className="text-right text-[14.5px] text-ink">{value}</dd>
//     </div>
//   );
// }

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
      ? 'text-[#A2612F]'
      : state === 'idle'
        ? 'text-[#9AA89D]'
        : 'text-cream-muted';
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
