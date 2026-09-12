'use client';

import Link from 'next/link';

import { FaceSlightlyFrowningIcon } from 'lucide-react';

import { useBookingSelection } from '@/components/BookingSelectionProvider';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  monthDayFormatter,
  shortDateFormatter,
  timeFormatter,
  weekDayFormatter,
} from '@/lib/formatters';
import { capitalize, cn, type GroupedSlots } from '@/lib/utils';

// SZEPTEMBER 13., VASÁRNAP
const formatDayTitle = (date: Date) =>
  `${monthDayFormatter.format(date)}, ${weekDayFormatter.format(date)}`.toUpperCase();

// Szept. 13. 12:00
const formatSlotLabel = (date: Date) =>
  `${capitalize(shortDateFormatter.format(date))} ${timeFormatter.format(date)}`;

export function TimeSlotAccordion({
  groupedTimeSlots,
}: {
  groupedTimeSlots: GroupedSlots;
}) {
  const { selectionQuery } = useBookingSelection();
  const days = Array.from(groupedTimeSlots.entries());

  if (days.length === 0) {
    return (
      <div className="mt-7 flex items-center justify-center gap-2 rounded-[22px] border border-cream/12 bg-cream/4 px-5 py-8 text-center text-sm text-sage-soft">
        <FaceSlightlyFrowningIcon
          strokeWidth={2}
          className="size-5 shrink-0 opacity-60"
        />
        Jelenleg nincsenek szabad időpontjaink, kérjük nézz vissza később.
      </div>
    );
  }

  return (
    <Accordion
      multiple={false}
      defaultValue={[days[0][0]]}
      className="mx-auto mt-7 max-w-160 overflow-hidden rounded-[22px] border border-cream/12 bg-cream/4 sm:mt-11"
    >
      {days.map(([dayKey, daySlots]) => (
        <AccordionItem
          key={dayKey}
          value={dayKey}
          className="not-last:border-b not-last:border-cream/12"
        >
          <AccordionTrigger className="items-center px-5 py-4.5 text-sm font-black tracking-wide text-cream-strong transition-colors hover:bg-cream/4 **:data-[slot=accordion-trigger-icon]:text-sage-dim sm:px-6.5 md:text-base">
            {formatDayTitle(daySlots[0].startTime)}
          </AccordionTrigger>
          <AccordionContent className="px-5 pt-0 pb-2 sm:px-6.5">
            <ul className="flex flex-col">
              {daySlots.map(({ id, startTime, revealed, photoShooting }) => {
                const taken = !revealed || photoShooting != null;

                const row = (
                  <>
                    <span
                      className={cn(
                        'text-base text-cream',
                        taken && 'text-sage-dim/70 line-through',
                      )}
                    >
                      {formatSlotLabel(startTime)}
                    </span>
                    <span
                      className={cn(
                        'text-base font-bold tracking-wide uppercase',
                        taken ? 'text-terracotta-hover' : 'text-emerald-300',
                      )}
                    >
                      {taken ? 'Foglalt' : 'Szabad'}
                    </span>
                  </>
                );

                return (
                  <li
                    key={id}
                    className="border-t border-dashed border-cream/10 first:border-t-0"
                  >
                    {taken ? (
                      <div
                        aria-disabled
                        className="flex items-center justify-between gap-4 px-2 py-3"
                      >
                        {row}
                      </div>
                    ) : (
                      <Link
                        href={`/foglalas/${id}${selectionQuery}`}
                        className="flex items-center justify-between gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-cream/6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                      >
                        {row}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
