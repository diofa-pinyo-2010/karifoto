'use client';

import { useBookingSelection } from '@/components/BookingSelectionProvider';
import { DECOR_SETS, PACKAGES } from '@/lib/catalog';

export function BookingSelectionNote() {
  const { packageKey, decorKey, light } = useBookingSelection();

  const parts = [
    packageKey ? PACKAGES[packageKey].label : null,
    decorKey ? DECOR_SETS[decorKey].label : null,
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
