'use client';

import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion';
import { FaceSlightlyFrowningIcon } from 'lucide-react';

import { useBookingSelection } from '@/components/BookingSelectionProvider';
import { TimeSlotItem } from '@/components/TimeSlotItem';
import { WeekdayNote } from '@/components/WeekdayNote';
import {
  monthDayFormatter,
  weekDayFormatter,
  weekDayFormatterShort,
} from '@/lib/formatters';
import { isWeekdayKey, type GroupedSlots } from '@/lib/utils';

import type { TimeSlotPublic } from '@/lib/queries';

// SZEPTEMBER 13., VASÁRNAP/V
const formatDayTitle = (date: Date, opts: { short: boolean }) =>
  `${monthDayFormatter.format(date)}, ${opts.short ? weekDayFormatterShort.format(date) : weekDayFormatter.format(date)}`.toUpperCase();

export function TimeSlotAccordion({
  groupedTimeSlots,
}: {
  groupedTimeSlots: GroupedSlots<TimeSlotPublic>;
}) {
  const { selectionQuery } = useBookingSelection();
  const days = Array.from(groupedTimeSlots.entries());

  if (days.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 px-1 py-8 text-center text-sm text-brand-muted">
        <FaceSlightlyFrowningIcon
          strokeWidth={2}
          className="size-5 shrink-0 opacity-60"
        />
        Jelenleg nincsenek szabad időpontjaink, kérjük nézz vissza később.
      </div>
    );
  }

  return (
    <AccordionPrimitive.Root
      multiple={false}
      /**
       * Mindegyik nap maradjon csukva, mert sok helyet foglal mobilon nyitott
       * helyzetben, és nem tudják használni.
       */
      // defaultValue={[days[0][0]]}
      className="flex flex-col"
    >
      {days.map(([dayKey, daySlots]) => {
        const isWeekday = isWeekdayKey(dayKey);

        return (
          <AccordionPrimitive.Item
            key={dayKey}
            value={dayKey}
            className="border-b border-brand-ink/15 last:border-b-0"
          >
            <AccordionPrimitive.Header className="flex">
              <AccordionPrimitive.Trigger className="group flex min-h-16 flex-1 items-center justify-between gap-2 py-4 text-left text-[11px] font-semibold tracking-wide focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ad7135]">
                {formatDayTitle(daySlots[0].startTime, { short: isWeekday })}
                {isWeekday && <WeekdayNote />}
                <span
                  aria-hidden="true"
                  className="text-2xl leading-none font-normal text-[#657a70]"
                >
                  <span className="group-data-panel-open:hidden">+</span>
                  <span className="hidden group-data-panel-open:inline">−</span>
                </span>
              </AccordionPrimitive.Trigger>
            </AccordionPrimitive.Header>
            <AccordionPrimitive.Panel className="h-(--accordion-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0">
              <div>
                {/* Két oszlop `sm`-től: a panel `lg`-n a rács fele, de ott is elég
                  széles két idősávhoz. */}
                <ul className="grid gap-2 pb-5 sm:grid-cols-2">
                  {daySlots.map((slot) => (
                    <TimeSlotItem
                      key={slot.id}
                      slot={slot}
                      selectionQuery={selectionQuery}
                    />
                  ))}
                </ul>
              </div>
            </AccordionPrimitive.Panel>
          </AccordionPrimitive.Item>
        );
      })}
    </AccordionPrimitive.Root>
  );
}
