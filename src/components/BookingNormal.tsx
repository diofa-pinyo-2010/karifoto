import { BookingTable } from '@/components/BookingTable';
import { fetchTimeSlotsPublic } from '@/lib/queries';
import { groupByDay } from '@/lib/utils';

export async function BookingNormal() {
  const normalTimeSlots = await fetchTimeSlotsPublic();

  const groupedSlots = groupByDay(normalTimeSlots, (slot) => slot.startTime);
  const nextSixDays = new Map([...groupedSlots].slice(0, 6));

  return (
    <section
      id="foglalas-vip"
      className="brand-section bg-[#ede8de] bg-[radial-gradient(ellipse_at_0%_30%,#d5e1d947,transparent_50%)]"
    >
      <div className="brand-shell flex flex-col gap-9 sm:px-10 lg:flex-row-reverse lg:justify-center lg:gap-20 lg:px-12">
        <div className="flex-1">
          <p className="brand-eyebrow">VIP időpontok</p>
          <h2 className="brand-heading">
            A legjobb időpontok
            <br />
            <em>Karácsony közelében</em>
          </h2>
          <p className="brand-intro">
            Nálunk nem kell email-t írnod a foglaláshoz, vagy átutalással
            bajlódnod. Foglald le a helyed erre a legsűrűbb időszakra még
            időben, csak pár kattintással.
          </p>
        </div>
        <BookingTable
          label="A legjobb időpontok"
          groupedTimeSlots={nextSixDays}
          className="w-full flex-1"
        />
      </div>
    </section>
  );
}
