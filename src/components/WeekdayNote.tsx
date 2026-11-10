import { WEEKDAY_DISCOUNT_AMOUNT } from '@/lib/constants';
import { formatMoney } from '@/lib/utils';

export function WeekdayNote() {
  return (
    <span className="relative isolate inline-block px-1.5 font-handwritten text-base font-normal text-brand-accent lg:text-xl">
      <span
        aria-hidden
        className="absolute inset-x-0 top-[30%] bottom-[8%] -z-10 -rotate-1 rounded-[3px_10px_4px_12px] bg-[#ffe27a]/70"
      />
      hétköznap -{formatMoney(WEEKDAY_DISCOUNT_AMOUNT)}!
    </span>
  );
}
