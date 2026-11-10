import { LastMinuteNote } from '@/components/LastMinuteNote';
import { LastMinuteTable } from '@/components/LastMinuteTable';
import { DEPOSIT_AMOUNT } from '@/lib/constants';
import { fetchEarlyBirdTimeSlotsPublic } from '@/lib/queries';
import { formatMoney } from '@/lib/utils';

export async function BookingLastMinute() {
  // Az early bird időszak idősávjai, de csak a még szabadok.
  const freeTimeSlots = (await fetchEarlyBirdTimeSlotsPublic()).filter(
    (slot) => slot.revealed && slot.photoShooting == null,
  );

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
            TODO: Nálunk nem kell emailt írogatni, egyszerű foglalni,
            stb...
          </p> */}
          <ol className="mt-7 space-y-3 lg:block">
            {[
              <div key="1">
                Kattints valamelyik napra, hogy lásd a{' '}
                <strong className="text-base font-black text-brand-selected">
                  SZABAD
                </strong>{' '}
                időpontokat.
              </div>,
              'Töltsd ki rövid űrlapunkat',
              `Egyszerűen, bankkártyával fizetheted ki az előleget (${formatMoney(DEPOSIT_AMOUNT)})*`,
            ].map((step, i) => (
              <li key={i} className="flex items-center gap-3 text-xs">
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
          <LastMinuteNote />
        </div>
        <LastMinuteTable
          label="Last Minute időpontok"
          timeSlots={freeTimeSlots}
        />
      </div>
    </section>
  );
}
