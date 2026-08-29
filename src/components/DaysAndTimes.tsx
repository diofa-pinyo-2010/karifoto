'use client';

import { useAppContext } from '@/components/AppContextProvider';
import { Step } from '@/components/Step';
import {
  shortDateFormatter,
  timeFormatter,
  weekDayFormatter,
} from '@/lib/formatters';
import { cn, type GroupedSlots } from '@/lib/utils';

export function DaysAndTimes({
  groupedTimeSlots,
}: {
  groupedTimeSlots: GroupedSlots;
}) {
  const ctx = useAppContext();

  return (
    <>
      <Step n={3} label="Nap" className="mt-7" />
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
        {Array.from(groupedTimeSlots.entries())
          .slice(0, 6)
          .map(([dayKey, daySlots]) => {
            const availableSlots =
              daySlots?.filter(
                (slot) => slot.revealed && slot.photoShooting == null,
              ) ?? [];
            const full = availableSlots.length === 0;
            const dayLabel = full
              ? 'Betelt'
              : `${availableSlots.length} időpont`;
            const active = ctx.selectedDayKey === dayKey;

            return (
              <button
                type="button"
                key={dayKey}
                onClick={() => ctx.selectDay(dayKey)}
                className={cn(
                  'rounded-2xl border border-ink/18 bg-ink/4 px-4 py-3.5 text-left text-ink transition-colors',
                  active && 'border-ink bg-ink text-cream',
                  full && 'opacity-40',
                )}
              >
                <span className="block text-[11px] tracking-[.16em] uppercase opacity-70">
                  {weekDayFormatter.format(daySlots[0].startTime)}
                </span>
                <span className="mt-0.5 block font-display text-2xl">
                  {shortDateFormatter.format(daySlots[0].startTime)}
                </span>
                <span className="mt-1 block text-xs opacity-75">
                  {dayLabel}
                </span>
              </button>
            );
          })}
      </div>

      <Step n={4} label="Idősáv" className="mt-7" />
      <div className="mt-3 flex flex-wrap gap-2.5">
        {ctx.timeSlotsForSelectedDay &&
          ctx.timeSlotsForSelectedDay.map(
            ({ id, startTime, revealed, photoShooting }) => {
              const selected = ctx.selectedTimeSlotId === id;
              const taken = !revealed || photoShooting != null;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => ctx.selectTime(id)}
                  disabled={taken}
                  className={cn(
                    'rounded-[14px] border border-ink/50 px-5.5 py-3.5 text-[15px] text-ink transition-colors hover:border-ink/50 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
                    selected &&
                      'border-terracotta bg-terracotta text-[#FFF4E6]',
                    taken && 'text-terracotta-hover line-through',
                  )}
                >
                  {timeFormatter.format(startTime)}
                </button>
              );
            },
          )}
      </div>
    </>
  );
}
