'use client';

import { createContext, useContext, useMemo, useState } from 'react';

import {
  EMPTY_BOOKING_SELECTION,
  selectionToQuery,
  type BookingSelection,
} from '@/lib/booking-selection';

import type { DecorSetKey, PackageKey } from '@/lib/data';

type BookingSelectionApi = BookingSelection & {
  selectPackage: (key: PackageKey) => void;
  selectDecorSet: (key: DecorSetKey) => void;
  toggleLight: () => void;
  /** `?package=mini&decor=alomkastely&light=false` — a foglalás linkjéhez. */
  selectionQuery: string;
};

const Ctx = createContext<BookingSelectionApi | null>(null);

export function BookingSelectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selection, setSelection] = useState<BookingSelection>(
    EMPTY_BOOKING_SELECTION,
  );

  const api = useMemo<BookingSelectionApi>(
    () => ({
      ...selection,
      selectionQuery: selectionToQuery(selection),
      selectPackage: (key) => setSelection((s) => ({ ...s, packageKey: key })),
      selectDecorSet: (key) => setSelection((s) => ({ ...s, decorKey: key })),
      toggleLight: () => setSelection((s) => ({ ...s, light: !s.light })),
    }),
    [selection],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useBookingSelection() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error(
      'useBookingSelection must be inside <BookingSelectionProvider>',
    );
  }
  return ctx;
}
