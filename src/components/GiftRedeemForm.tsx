'use client';

import { useActionState, useState } from 'react';

import { Input } from '@/components/ui/input';
import { APP_URLS } from '@/lib/constants';
import { redeemGift } from '@/server/gift';

const LABEL_CLASS = 'font-display text-2xl font-medium text-ink';
const TEXT_CONTROL_CLASS = 'h-12 bg-white/62 text-base';

/**
 * Az ajándék beváltó űrlapja. A mezők kontrolláltak, mert a React egy
 * sikertelen action után alaphelyzetbe állítaná a nem kontrollált űrlapot.
 */
export function GiftRedeemForm({ giftCode }: { giftCode: string }) {
  const [state, formAction, isPending] = useActionState(
    redeemGift.bind(null, giftCode),
    undefined,
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [optOut, setOptOut] = useState(false);

  if (state?.checkInbox) {
    return (
      <section className="mx-auto max-w-130 px-4.5 pt-8 pb-10 text-center sm:px-10">
        <div className="eyebrow-ink">Sikeres beváltás</div>
        <p className="mx-auto mt-3.5 max-w-100 text-lg leading-[1.6] text-pretty text-ink">
          Küldtünk egy emailt a(z) {email.trim()} címre, azzal tudsz belépni.
        </p>
      </section>
    );
  }

  return (
    <form
      action={formAction}
      className="mx-auto flex max-w-130 flex-col gap-9 px-4.5 pt-8 pb-10 sm:px-10"
    >
      <div className="flex flex-col gap-3">
        <label htmlFor="gift-name" className={LABEL_CLASS}>
          Neved<span className="ml-1 text-terracotta">*</span>
        </label>
        <Input
          id="gift-name"
          name="name"
          autoComplete="name"
          placeholder="Kovács Anna"
          required
          minLength={2}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={TEXT_CONTROL_CLASS}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-3">
          <label htmlFor="gift-email" className={LABEL_CLASS}>
            E-mail címed<span className="ml-1 text-terracotta">*</span>
          </label>
          <Input
            id="gift-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="anna@example.com"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={TEXT_CONTROL_CLASS}
          />
        </div>
        <label
          htmlFor="gift-opt-out"
          className="flex cursor-pointer items-start gap-3 text-base font-light text-cream-muted"
        >
          <input
            id="gift-opt-out"
            name="optOut"
            type="checkbox"
            checked={optOut}
            onChange={(event) => setOptOut(event.target.checked)}
            className="mt-1 size-5 accent-brand-selected"
          />
          Nem szeretnék levelet kapni a hírekről és akciókról.
        </label>
      </div>

      <div className="flex flex-col gap-3">
        <label htmlFor="gift-phone" className={LABEL_CLASS}>
          Telefonszámod<span className="ml-1 text-terracotta">*</span>
        </label>
        <Input
          id="gift-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+36 30 123 4567"
          required
          minLength={6}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className={TEXT_CONTROL_CLASS}
        />
      </div>

      <div className="text-[12.5px] leading-[1.6] text-pretty text-cream-muted">
        A beváltással elfogadod az{' '}
        <a
          href={APP_URLS.terms}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Általános Szerződési Feltételeket
        </a>
        .
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-cream/15 bg-forest/78 px-4 pt-3.5 pb-[calc(14px+env(safe-area-inset-bottom))] shadow-[0_-12px_32px_rgba(20,51,42,.16)] backdrop-blur-xl sm:px-10">
        <div className="mx-auto flex max-w-180 justify-center sm:justify-end">
          <button
            type="submit"
            disabled={isPending}
            className={`w-full max-w-90 rounded-full px-5 py-4.25 text-base font-medium transition-colors ${
              isPending
                ? 'cursor-not-allowed bg-[#a67f4a]'
                : 'bg-brand-champagne shadow-[0_14px_32px_rgba(184,80,58,.3)] hover:bg-brand-champagne-hover'
            }`}
          >
            {isPending ? 'Feldolgozás…' : 'Beváltom az ajándékot'}
          </button>
        </div>
        {state?.error && (
          <div
            role="alert"
            className="mx-auto mt-2.5 max-w-180 text-center text-[13px] text-terracotta sm:text-right"
          >
            {state.error}
          </div>
        )}
      </div>
    </form>
  );
}
