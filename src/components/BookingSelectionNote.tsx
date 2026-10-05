'use client';

import { useBookingSelection } from '@/components/BookingSelectionProvider';
import { PACKAGES } from '@/lib/catalog';
import { photoShootingSets } from '@/lib/data';

/**
 * A foglalási panel tetején megjelenő „A választásod” sor. Csak azért külön
 * komponens, hogy a `Booking` szerver oldali maradhasson: a kiválasztás a
 * `BookingSelectionProvider` kliens kontextusából jön.
 *
 * Amíg nincs választás, semmit nem rendereltünk — a panel ilyenkor egyből a
 * szabad időpontokkal indul.
 */
export function BookingSelectionNote() {
  const { packageKey, decorKey, light } = useBookingSelection();

  const parts = [
    packageKey ? PACKAGES[packageKey].label : null,
    decorKey ? photoShootingSets[decorKey].name : null,
    light ? 'Fényjáték' : null,
  ].filter(Boolean);

  if (parts.length === 0) return null;

  return (
    <p
      aria-live="polite"
      className="border-b border-brand-ink/10 bg-brand-ice/25 px-5 py-3 text-xs leading-6"
    >
      A választásod: {parts.join(' + ')}
    </p>
  );
}
