import { fromBudapestDayAndTime } from '@/lib/utils';

/**
 * A `SiteSettings.earlyBirdDeadline` (`@db.Date`) napkulcsa, pl. `2026-11-21`.
 * A Prisma a DATE oszlopot UTC éjfélként adja vissza, ezért az ISO-string első
 * tíz karaktere pontosan az eltárolt nap — időzónától függetlenül.
 */
export function dbDateToDayKey(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

/**
 * A határnap budapesti éjfele: az ennél korábban kezdődő idősáv early bird /
 * last minute. `2026-11-21` → 2026-11-20T23:00:00Z (télen +01:00, nyáron
 * +02:00). Null → nincs early bird időszak.
 */
export function earlyBirdDeadlineFromDayKey(
  dayKey: string | null,
): Date | null {
  return dayKey ? fromBudapestDayAndTime(dayKey, '00:00') : null;
}
