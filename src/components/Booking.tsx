import { BookingSelectionNote } from '@/components/BookingSelectionNote';
import { EarlyBirdNote } from '@/components/EarlyBirdNote';
import { TimeSlotAccordion } from '@/components/TimeSlotAccordion';
import { DEPOSIT_AMOUNT } from '@/lib/constants';
import { getSiteSettings } from '@/lib/queries';
import { formatMoney } from '@/lib/utils';

import type { TimeSlotPublic } from '@/lib/queries';
import type { GroupedSlots } from '@/lib/utils';

export async function Booking({
  groupedTimeSlots,
}: {
  groupedTimeSlots: GroupedSlots<TimeSlotPublic>;
}) {
  const { automaticEarlyBirdEnabled } = await getSiteSettings();

  return (
    <section
      id="foglalas"
      className="brand-section bg-brand-cream bg-[radial-gradient(ellipse_at_0%_30%,#d5e1d947,transparent_50%)]"
    >
      <div className="brand-shell grid gap-9 sm:px-10 lg:grid-cols-[1fr_1.05fr] lg:gap-20 lg:px-12">
        <div>
          <p className="brand-eyebrow">Extra gyors foglalás</p>
          <h2 className="brand-heading">
            Biztosítsd a helyed
            <br />
            <em>csak pár kattintással!</em>
          </h2>
          {/* <p className="brand-intro">
            TODO: Nálunk nem kell emailt írogatni, kurva egyszerű foglalni,
            stb...
          </p> */}

          {/* A lépések csak desktopon jelennek meg: mobilon a panel közvetlenül
              a szöveg alá kerül, ott a felsorolás csak távolabb tolná. */}
          <ol className="mt-7 space-y-3 lg:block">
            {[
              'Válaszd ki az időpontod',
              'Töltsd ki rövid űrlapunkat',
              `Egyszerűen, bankkártyával fizetheted ki az előleget (${formatMoney(DEPOSIT_AMOUNT)})*`,
            ].map((step, i) => (
              <li key={step} className="flex items-center gap-3 text-xs">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-brand-ink/20 text-[10px]">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-brand-muted">
            *Betegség esetén találunk nektek másik időpontot.
          </p>
          {automaticEarlyBirdEnabled && <EarlyBirdNote />}
        </div>

        <div className="self-start overflow-hidden rounded-xl border border-[#cbd2c4] bg-brand-paper shadow-[0_12px_50px_#2a493408]">
          <div className="flex items-center justify-between gap-3 bg-brand-ink px-5 py-5 text-brand-cream">
            <span className="font-display text-2xl">
              {automaticEarlyBirdEnabled
                ? 'Early Bird időpontok:'
                : 'Szabad időpontok'}
            </span>
            <span className="text-xs text-brand-champagne">2026</span>
          </div>
          <BookingSelectionNote />
          <div className="px-5">
            <TimeSlotAccordion groupedTimeSlots={groupedTimeSlots} />
          </div>
          <p className="px-5 py-4 text-[10px] leading-5 text-brand-muted">
            Az időpontokra kattintva tudod folytatni a foglalást.
          </p>
        </div>
      </div>
    </section>
  );
}
