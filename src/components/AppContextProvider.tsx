'use client';

import { createContext, useContext, useMemo, useState } from 'react';

import { LIGHT_PLAY_FEE } from '@/lib/constants';
import {
  packages,
  type PackageKey,
  photoShootingSets,
  DecorSetKey,
  SET_ORDER,
} from '@/lib/data';
import { GroupedSlots } from '@/lib/utils';
import { TimeSlotsWithPhotoShooting } from '@/server/time-slots';

/**
 * 1. STATE  —  KIZÁRÓLAG a user választásai. Primitívek.
 * Nincs benne derivált érték (ár, label…) és nincs szerver-adat.
 * Ez az egyetlen dolog, amit "karban kell tartani".
 */
type AppState = {
  selectedPackageKey: PackageKey;
  selectedDecorSetKey: DecorSetKey;
  selectedDayKey: string | null;
  selectedTimeSlotId: string | null;
  isLightPlaySelected: boolean; // Fényjáték extra (Family csomagban alapból jár)
  name: string;
  email: string;
};

type DecorSet = {
  key: DecorSetKey;
  name: string;
  selected: boolean;
  disabled: boolean;
};

/**
 * 2. API – amit a useBooking() ad vissza a komponenseknek.
 * selections  +  derivált értékek  +  action-ök.
 * A derivált mezőkre nincs setter → fogalmilag lehetetlen
 * "beállítani" egy számolt értéket, csak a bemenetet.
 */
type AppContextApi = AppState & {
  isLightPlayIncluded: boolean;
  isLightPlayOn: boolean;
  bothDecorSets: boolean;
  selectedPackage: (typeof packages)[number];
  timeSlotsForSelectedDay: ReturnType<GroupedSlots['get']> | null;
  decorSets: DecorSet[];
  decorSetLabel: string;
  estimatedTotalAmount: number;
  canConfirm: boolean;
  selectedTimeSlot: TimeSlotsWithPhotoShooting | null;
  selectPackage: (key: PackageKey) => void;
  selectDecorSet: (key: DecorSetKey) => void;
  toggleLightPlay: () => void;
  setName: (v: string) => void;
  setEmail: (v: string) => void;
  selectDay: (key: string) => void;
  selectTime: (id: string) => void;
};

const Ctx = createContext<AppContextApi | null>(null);

export function AppProvider({
  children,
  availableTimeSlotsGrouped,
}: {
  children: React.ReactNode;
  availableTimeSlotsGrouped: GroupedSlots;
}) {
  const [state, setState] = useState<AppState>({
    selectedPackageKey: 'classic',
    selectedDecorSetKey: 'hofeher',
    selectedDayKey: availableTimeSlotsGrouped.keys().next().value ?? null,
    selectedTimeSlotId: null,
    isLightPlaySelected: false,
    name: '',
    email: '',
  });

  const api = useMemo<AppContextApi>(() => {
    const selectedPackage =
      packages.find((p) => p.id === state.selectedPackageKey) ?? packages[1];
    const bothDecorSets = state.selectedPackageKey !== 'mini';
    const timeSlotsForSelectedDay = state.selectedDayKey
      ? (availableTimeSlotsGrouped.get(state.selectedDayKey) ?? null)
      : null;
    const selectedTimeSlot =
      Array.from(availableTimeSlotsGrouped.values())
        .flat()
        .find((slot) => slot.id === state.selectedTimeSlotId) ?? null;
    const isLightPlayIncluded = state.selectedPackageKey === 'family';
    const isLightPlayOn = isLightPlayIncluded || state.isLightPlaySelected;
    const canConfirm =
      !!state.selectedTimeSlotId &&
      state.name.trim().length > 1 &&
      state.email.includes('@');

    const decorSets: DecorSet[] = SET_ORDER.map((key) => ({
      key,
      name: photoShootingSets[key].name,
      selected: bothDecorSets ? true : key === state.selectedDecorSetKey,
      disabled: bothDecorSets,
    }));

    const decorSetLabel = bothDecorSets
      ? SET_ORDER.map((key) => photoShootingSets[key].name).join(' + ')
      : `${photoShootingSets[state.selectedDecorSetKey].name} díszlet`;

    const estimatedTotalAmount =
      selectedPackage.priceHuf +
      selectedPackage.studioFeeHuf +
      (isLightPlayIncluded
        ? 0
        : state.isLightPlaySelected
          ? LIGHT_PLAY_FEE
          : 0);

    return {
      ...state,
      bothDecorSets,
      selectedPackage,
      timeSlotsForSelectedDay,
      isLightPlayIncluded,
      isLightPlayOn,
      decorSets,
      decorSetLabel,
      estimatedTotalAmount,
      canConfirm,
      selectedTimeSlot,
      setName: (v) => setState((s) => ({ ...s, name: v })),
      setEmail: (v) => setState((s) => ({ ...s, email: v })),
      selectPackage: (key: PackageKey) =>
        setState((s) => ({ ...s, selectedPackageKey: key })),
      selectDecorSet: (key: DecorSetKey) =>
        setState((s) =>
          s.selectedPackageKey !== 'mini'
            ? s
            : { ...s, selectedDecorSetKey: key },
        ),

      selectDay: (key: string) =>
        setState((s) => ({
          ...s,
          selectedDayKey: key,
          selectedTimeSlotId: null,
        })),
      selectTime: (id: string) =>
        setState((s) => ({ ...s, selectedTimeSlotId: id })),
      toggleLightPlay: () =>
        setState((s) =>
          s.selectedPackageKey === 'family'
            ? s
            : { ...s, isLightPlaySelected: !s.isLightPlaySelected },
        ),
    };
  }, [state, availableTimeSlotsGrouped]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useAppContext() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppContext must be inside <AppProvider>');
  return ctx;
}
