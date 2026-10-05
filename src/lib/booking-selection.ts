import { type DecorSet, Package } from '@/generated/prisma/enums';
import {
  packageFromSlug,
  packageSlug,
  decorSetFromSlug,
  decorSetSlug,
} from '@/lib/catalog';

/**
 * A főoldali CTA-kban összekattintott választások.
 * Nem szerver-állapot: csak a foglalás linkjébe (query stringbe) kerül bele,
 * a /foglalas/[timeSlotId] oldal onnan olvassa vissza.
 */
export type BookingSelection = {
  packageKey: Package | null;
  decorKey: DecorSet | null;
  light: boolean;
};

export const EMPTY_BOOKING_SELECTION: BookingSelection = {
  packageKey: null,
  decorKey: null,
  light: false,
};

/** → `?package=mini&decor=retro&light=false` */
export function selectionToQuery(selection: BookingSelection): string {
  const params = new URLSearchParams();
  if (selection.packageKey)
    params.set('package', packageSlug(selection.packageKey));
  if (selection.decorKey) params.set('decor', decorSetSlug(selection.decorKey));
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
  return {
    packageKey: packageFromSlug(first(searchParams.package)),
    decorKey: decorSetFromSlug(first(searchParams.decor)),
    light: first(searchParams.light) === 'true',
  };
}
