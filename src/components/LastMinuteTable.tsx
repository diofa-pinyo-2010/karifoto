'use client';

import { FaceSlightlyFrowningIcon } from 'lucide-react';

import { BookingSelectionNote } from '@/components/BookingSelectionNote';
import { useBookingSelection } from '@/components/BookingSelectionProvider';
import { TimeSlotItem } from '@/components/TimeSlotItem';
import { WeekdayNote } from '@/components/WeekdayNote';
import { dateFormatter } from '@/lib/formatters';
import { groupByDay, isWeekdayKey } from '@/lib/utils';

import type { TimeSlotPublic } from '@/lib/queries';

/**
 * A `BookingTable` kinézete, de harmonika helyett lapos listában mutatja az
 * idősávokat — a last minute időpontokból kevés van, nem kell napokra bontani.
 */
export function LastMinuteTable({
  label,
  timeSlots,
}: {
  label: string;
  timeSlots: TimeSlotPublic[];
}) {
  const { selectionQuery } = useBookingSelection();

  return (
    <div className="self-start overflow-hidden rounded-xl border border-[#cbd2c4] bg-brand-paper shadow-[0_12px_50px_#2a493408]">
      <div className="flex items-center justify-between gap-3 bg-brand-ink px-5 py-5 text-brand-cream">
        <span className="font-display text-2xl">{label}</span>
        <span className="text-xs text-brand-champagne">2026</span>
      </div>
      <BookingSelectionNote />
      <div className="px-5">
        {timeSlots.length === 0 ? (
          <div className="flex items-center justify-center gap-2 px-1 py-8 text-center text-sm text-brand-muted">
            <FaceSlightlyFrowningIcon
              strokeWidth={2}
              className="size-5 shrink-0 opacity-60"
            />
            Jelenleg nincsenek szabad időpontjaink, kérjük nézz vissza később.
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-5">
            {Array.from(groupByDay(timeSlots, (slot) => slot.startTime)).map(
              ([dayKey, daySlots]) => (
                <div key={dayKey}>
                  <div className="mb-2 flex items-center gap-2">
                    <h3 className="text-xs font-semibold">
                      {dateFormatter.format(daySlots[0].startTime)}
                    </h3>
                    {isWeekdayKey(dayKey) && <WeekdayNote />}
                  </div>
                  <ul className="flex flex-col gap-2">
                    {daySlots.map((slot) => (
                      <TimeSlotItem
                        key={slot.id}
                        slot={slot}
                        selectionQuery={selectionQuery}
                      />
                    ))}
                  </ul>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
