'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * Rögzített foglalási sáv mobilra. A fejléc a 2026-os arculatban `absolute`, és
 * a hero képével együtt elgörög, ezért a folyamatosan elérhető CTA szerepét ez
 * a sáv veszi át.
 *
 * Csak akkor látszik, ha sem a hero, sem a foglalási szekció nincs a képernyőn:
 * mindkettőben van saját foglalás gomb, ott a sáv csak takarna.
 *
 * A `Footer` alsó belső margója ehhez a sávhoz tart helyet.
 */
export function MobileBookingBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById('hero');
    const booking = document.getElementById('foglalas');
    if (!hero || !booking) return;

    let heroVisible = true;
    let bookingVisible = false;

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === hero) heroVisible = entry.isIntersecting;
        if (entry.target === booking) bookingVisible = entry.isIntersecting;
      }
      setVisible(!heroVisible && !bookingVisible);
    });

    observer.observe(hero);
    observer.observe(booking);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      aria-hidden={!visible}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-white/10 bg-[#102c32f5] px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] text-brand-cream shadow-xl backdrop-blur-[16px] transition-[opacity,translate] duration-200 ease-out lg:hidden',
        visible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-full opacity-0',
      )}
    >
      <span className="font-display text-[19px] max-[359px]:text-[16px]">
        Karácsony, veletek.
        <small className="mt-[3px] block font-brand-sans text-[8px] text-[#c1cec2]">
          Budapest · saját stúdió
        </small>
      </span>
      <a
        href="#foglalas"
        tabIndex={visible ? undefined : -1}
        className="inline-flex min-h-11 items-center justify-center gap-[9px] rounded-lg border border-transparent bg-brand-champagne px-3.5 py-2.5 text-[11px] font-semibold whitespace-nowrap text-[#152b2e] transition-colors duration-200 hover:bg-[#e3bf8d]"
      >
        Időpontot foglalok <span aria-hidden="true">→</span>
      </a>
    </div>
  );
}
