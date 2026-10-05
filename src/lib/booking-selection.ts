import { Package } from '@/generated/prisma/enums';
import { packageFromSlug, packageSlug } from '@/lib/catalog';
import { photoShootingSets, type DecorSetKey } from '@/lib/data';

/**
 * A főoldali CTA-kban összekattintott választások.
 * Nem szerver-állapot: csak a foglalás linkjébe (query stringbe) kerül bele,
 * a /foglalas/[timeSlotId] oldal onnan olvassa vissza.
 */
export type BookingSelection = {
  packageKey: Package | null;
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
  if (selection.packageKey)
    params.set('package', packageSlug(selection.packageKey));
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
  const decorKey = first(searchParams.decor);

  return {
    packageKey: packageFromSlug(first(searchParams.package)),
    decorKey:
      decorKey != null && decorKey in photoShootingSets
        ? (decorKey as DecorSetKey)
        : null,
    light: first(searchParams.light) === 'true',
  };
}
