'use client';

import { createContext, useContext, useMemo, useState } from 'react';

import { LIGHT_FEE, baseSetNames, days, packages } from '@/lib/data';

type BookingState = {
  pkgIndex: number;
  setIndex: number; // csak Mini esetén választható (0 = Hófehér)
  light: boolean; // Fényjáték extra (Family csomagban alapból jár)
  dayIndex: number;
  slot: string | null;
  name: string;
  email: string;
  confirmed: boolean;
};

type BookingApi = BookingState & {
  pkg: (typeof packages)[number];
  day: (typeof days)[number];
  /** Classic és Family: mindkét alapdíszlettel fotózunk, nem választható */
  bothSets: boolean;
  /** Family: a Fényjáték a csomag része, nem kapcsolható ki */
  lightIncluded: boolean;
  lightOn: boolean;
  setLabel: string;
  lightFee: number;
  /** csomag + stúdió bérlet + esetleges fényjáték felár */
  totalHuf: number;
  canConfirm: boolean;
  selectPackage: (i: number) => void;
  selectSet: (i: number) => void;
  toggleLight: () => void;
  selectDay: (i: number) => void;
  selectSlot: (t: string) => void;
  setName: (v: string) => void;
  setEmail: (v: string) => void;
  confirm: () => void;
  reset: () => void;
};

const Ctx = createContext<BookingApi | null>(null);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<BookingState>({
    pkgIndex: 1, // Classic előre kiválasztva — ez a konverziós cél
    setIndex: 0,
    light: false,
    dayIndex: 0,
    slot: null,
    name: '',
    email: '',
    confirmed: false,
  });

  const api = useMemo<BookingApi>(() => {
    const pkg = packages[state.pkgIndex];
    const day = days[state.dayIndex];
    const bothSets = state.pkgIndex > 0;
    const lightIncluded = state.pkgIndex === 2;
    const lightOn = lightIncluded || state.light;
    const canConfirm =
      !!state.slot && state.name.trim().length > 1 && state.email.includes('@');

    return {
      ...state,
      pkg,
      day,
      bothSets,
      lightIncluded,
      lightOn,
      setLabel: bothSets
        ? `${baseSetNames.join(' + ')} díszlet`
        : `${baseSetNames[state.setIndex]} díszlet`,
      lightFee: lightIncluded ? 0 : state.light ? LIGHT_FEE : 0,
      totalHuf:
        pkg.priceHuf +
        pkg.studioFeeHuf +
        (lightIncluded ? 0 : state.light ? LIGHT_FEE : 0),
      canConfirm,
      selectPackage: (i) => setState((s) => ({ ...s, pkgIndex: i })),
      selectSet: (i) =>
        setState((s) => (s.pkgIndex > 0 ? s : { ...s, setIndex: i })),
      toggleLight: () =>
        setState((s) => (s.pkgIndex === 2 ? s : { ...s, light: !s.light })),
      selectDay: (i) =>
        setState((s) =>
          days[i].slots.length ? { ...s, dayIndex: i, slot: null } : s,
        ),
      selectSlot: (t) => setState((s) => ({ ...s, slot: t })),
      setName: (v) => setState((s) => ({ ...s, name: v })),
      setEmail: (v) => setState((s) => ({ ...s, email: v })),
      // TODO(backend): POST { pkg.id, setIndex, light, day.id, slot, name, email }
      confirm: () =>
        setState((s) => (canConfirm ? { ...s, confirmed: true } : s)),
      reset: () => setState((s) => ({ ...s, confirmed: false, slot: null })),
    };
  }, [state]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useBooking() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useBooking must be used inside <BookingProvider>');
  return ctx;
}
