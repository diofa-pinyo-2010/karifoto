'use client';

import Link from 'next/link';

import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion';
import { FaceSlightlyFrowningIcon } from 'lucide-react';

import { useBookingSelection } from '@/components/BookingSelectionProvider';
import {
  monthDayFormatter,
  shortDateFormatter,
  timeFormatter,
  weekDayFormatter,
} from '@/lib/formatters';
import { capitalize, cn, type GroupedSlots } from '@/lib/utils';

import type { TimeSlotPublic } from '@/lib/queries';

// SZEPTEMBER 13., VASÁRNAP
const formatDayTitle = (date: Date) =>
  `${monthDayFormatter.format(date)}, ${weekDayFormatter.format(date)}`.toUpperCase();

// Szept. 13. 12:00
const formatSlotLabel = (date: Date) =>
  `${capitalize(shortDateFormatter.format(date))} ${timeFormatter.format(date)}`;

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
      defaultValue={[days[0][0]]}
      className="flex flex-col"
    >
      {days.map(([dayKey, daySlots]) => (
        <AccordionPrimitive.Item
          key={dayKey}
          value={dayKey}
          className="border-b border-brand-ink/15"
        >
          <AccordionPrimitive.Header className="flex">
            <AccordionPrimitive.Trigger className="group flex min-h-16 flex-1 items-center justify-between gap-2 py-4 text-left text-[11px] font-semibold tracking-wide focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ad7135]">
              {formatDayTitle(daySlots[0].startTime)}
              <span
                aria-hidden="true"
                className="text-2xl leading-none font-normal text-[#657a70]"
              >
                <span className="group-data-panel-open:hidden">+</span>
                <span className="hidden group-data-panel-open:inline">−</span>
              </span>
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Panel className="h-[var(--accordion-panel-height)] overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0">
            <div>
              {/* Két oszlop `sm`-től: a panel `lg`-n a rács fele, de ott is elég
                  széles két idősávhoz. */}
              <ul className="grid gap-2 pb-5 sm:grid-cols-2">
                {daySlots.map(({ id, startTime, revealed, photoShooting }) => {
                  const taken = !revealed || photoShooting != null;

                  const row = (
                    <>
                      <span className={cn(taken && 'line-through')}>
                        {formatSlotLabel(startTime)}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] font-semibold uppercase',
                          taken ? 'text-brand-taken' : 'text-brand-free',
                        )}
                      >
                        {taken ? 'Foglalt' : 'Szabad'}
                      </span>
                    </>
                  );

                  const rowClass =
                    'flex min-h-13 items-center justify-between gap-3 rounded-md border px-3 py-3 text-[11px]';

                  return (
                    <li key={id}>
                      {taken ? (
                        <div
                          aria-disabled
                          className={cn(
                            rowClass,
                            'cursor-not-allowed border-brand-taken-edge bg-brand-taken-surface text-brand-taken',
                          )}
                        >
                          {row}
                        </div>
                      ) : (
                        <Link
                          href={`/foglalas/${id}${selectionQuery}`}
                          className={cn(
                            rowClass,
                            'border-brand-free-edge bg-brand-free-surface transition-colors hover:border-brand-free-edge-hover hover:bg-brand-free-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ad7135]',
                          )}
                        >
                          {row}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </AccordionPrimitive.Panel>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}
