import type { Metadata } from 'next';

import { BookingFormNew } from '@/components/BookingFormNew';
import { BookingUnavailable } from '@/components/BookingUnavailable';
import { selectionFromSearchParams } from '@/lib/booking-selection';
import { formatLongDate } from '@/lib/formatters';
import { getTimeSlot } from '@/server/time-slots';

export const metadata: Metadata = {
  title: 'Foglalás · Karifoto',
};

export default async function BookingFormPage(
  props: PageProps<'/foglalas/[timeSlotId]'>,
) {
  const { timeSlotId } = await props.params;
  const selection = selectionFromSearchParams(await props.searchParams);
  const timeSlot = await getTimeSlot(timeSlotId);
  const isAvailable =
    timeSlot != null &&
    timeSlot.photoShooting == null &&
    timeSlot.revealed &&
    timeSlot.startTime.getTime() > Date.now();

  if (!isAvailable) {
    return (
      <BookingUnavailable
        title={
          <>
            Ez az időpont már
            <br />
            nem elérhető
          </>
        }
      />
    );
  }

  return (
    <>
      <section className="border-b border-ink/12 bg-white/45 sm:rounded-t-[28px]">
        <div className="mx-auto max-w-130 px-4.5 pt-5.5 pb-7 sm:px-10">
          <div className="eyebrow-ink">A választott időpont</div>
          <div className="mt-3.5 text-[26px] leading-[1.2] font-medium text-ink sm:text-[34px]">
            {formatLongDate(timeSlot.startTime)}
          </div>
        </div>
      </section>

      <BookingFormNew timeSlotId={timeSlotId} selection={selection} />
    </>
  );
}
