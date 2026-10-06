import { BookingTable } from '@/components/BookingTable';
import { EarlyBirdNote } from '@/components/EarlyBirdNote';
import { DEPOSIT_AMOUNT } from '@/lib/constants';
import { fetchEarlyBirdTimeSlotsPublic, getSiteSettings } from '@/lib/queries';
import { formatMoney, groupByDay } from '@/lib/utils';

export async function BookingEarlyBird() {
  const { automaticEarlyBirdEnabled } = await getSiteSettings();
  const earlyBirdTimeSlots = await fetchEarlyBirdTimeSlotsPublic();

  const groupedSlots = groupByDay(earlyBirdTimeSlots, (slot) => slot.startTime);
  const nextSixDays = new Map([...groupedSlots].slice(0, 6));

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
        <BookingTable
          label={
            automaticEarlyBirdEnabled
              ? 'Early Bird időpontok'
              : 'Szabad időpontok'
          }
          groupedTimeSlots={nextSixDays}
          showBookingSelection
        />
      </div>
    </section>
  );
}
