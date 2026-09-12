import {
  packages,
  photoShootingSets,
  type DecorSetKey,
  type PackageKey,
} from '@/lib/data';

/**
 * A főoldali CTA-kban összekattintott választások.
 * Nem szerver-állapot: csak a foglalás linkjébe (query stringbe) kerül bele,
 * a /foglalas/[timeSlotId] oldal onnan olvassa vissza.
 */
export type BookingSelection = {
  packageKey: PackageKey | null;
  decorKey: DecorSetKey | null;
  light: boolean;
};

export const EMPTY_BOOKING_SELECTION: BookingSelection = {
  packageKey: null,
  decorKey: null,
  light: false,
};

/** → `?package=mini&decor=alomkastely&light=false` */
export function selectionToQuery(selection: BookingSelection): string {
  const params = new URLSearchParams();
  if (selection.packageKey) params.set('package', selection.packageKey);
  if (selection.decorKey) params.set('decor', selection.decorKey);
  params.set('light', String(selection.light));
  return `?${params.toString()}`;
}

type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/** Ismeretlen / hiányzó érték → null (a query string user-input). */
export function selectionFromSearchParams(
  searchParams: RawSearchParams,
): BookingSelection {
  const packageKey = first(searchParams.package);
  const decorKey = first(searchParams.decor);

  return {
    packageKey: packages.some((p) => p.id === packageKey)
      ? (packageKey as PackageKey)
      : null,
    decorKey:
      decorKey != null && decorKey in photoShootingSets
        ? (decorKey as DecorSetKey)
        : null,
    light: first(searchParams.light) === 'true',
  };
}

export const packageName = (key: PackageKey | null) =>
  packages.find((p) => p.id === key)?.name ?? null;

export const decorSetName = (key: DecorSetKey | null) =>
  key ? photoShootingSets[key].name : null;
