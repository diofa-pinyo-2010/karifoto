import { BookingSelectionNote } from '@/components/BookingSelectionNote';
import { TimeSlotAccordion } from '@/components/TimeSlotAccordion';
import { TimeSlotPublic } from '@/lib/queries';
import { cn, GroupedSlots } from '@/lib/utils';

interface BookingTableProps {
  label: string;
  groupedTimeSlots: GroupedSlots<TimeSlotPublic>;
  showBookingSelection?: boolean;
  className?: string;
}

export function BookingTable({
  label,
  groupedTimeSlots,
  className,
  showBookingSelection = false,
}: BookingTableProps) {
  return (
    <div
      className={cn(
        'self-start overflow-hidden rounded-xl border border-[#cbd2c4] bg-brand-paper shadow-[0_12px_50px_#2a493408]',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 bg-brand-ink px-5 py-5 text-brand-cream">
        <span className="font-display text-2xl">{label}</span>
        <span className="text-xs text-brand-champagne">2026</span>
      </div>
      {showBookingSelection && <BookingSelectionNote />}
      <div className="px-5">
        <TimeSlotAccordion groupedTimeSlots={groupedTimeSlots} />
      </div>
      {/* <p className="px-5 py-4 text-[10px] leading-5 text-brand-muted">
        Az időpontokra kattintva tudod folytatni a foglalást.
      </p> */}
    </div>
  );
}
