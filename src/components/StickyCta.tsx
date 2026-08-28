'use client';

import { useBooking } from '@/components/BookingProvider';
import { useIsMobile } from '@/hooks/use-mobile';
import { SLOTS_LEFT_LABEL } from '@/lib/data';

export function StickyCta() {
  const b = useBooking();
  const isMobile = useIsMobile();

  if (b.confirmed || isMobile) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-gold/25 bg-ink/95 px-3.5 py-3 backdrop-blur-lg sm:px-7">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-3">
        <div className="mr-auto min-w-[140px]">
          <div className="text-[15px] text-[#F1E7D5]">
            {b.slot
              ? `${b.pkg.name} · ${b.day.label} ${b.slot}`
              : `${b.pkg.name} csomag · ${b.pkg.price}`}
          </div>
          <div className="text-xs text-sage-dim">{SLOTS_LEFT_LABEL}</div>
        </div>
        <a
          href="#foglalas"
          className="btn-cta min-w-[min(100%,200px)] px-5 py-[15px] text-[15px] sm:px-8"
        >
          Időpontot választok
        </a>
      </div>
    </div>
  );
}
