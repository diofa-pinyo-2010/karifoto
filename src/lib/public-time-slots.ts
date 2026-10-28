import { revalidateTag } from 'next/cache';

import { EARLY_BIRD_DATE_DEADLINE } from '@/lib/constants';

export const PUBLIC_TIME_SLOTS_TAG = 'public-time-slots';

/**
 * Minden olyan írás után hívandó, ami a főoldalon látható foglalhatóságot
 * változtatja (idősáv létrehozása/törlése/láthatósága, fotózás létrejötte vagy
 * áthelyezése). `{ expire: 0 }`: a következő render megvárja a friss listát,
 * soha nem a régit kapja — egy már foglalt időpont nem maradhat szabadnak
 * mutatva.
 */
export function invalidatePublicTimeSlots() {
  revalidateTag(PUBLIC_TIME_SLOTS_TAG, { expire: 0 });
}

type WithDate<T> = Omit<T, 'startTime'> & { startTime: Date };

/**
 * A cache-elt idősávlistát szétválasztja early bird és normál időpontokra,
 * pontosan a korábbi két lekérdezés szűrőivel. A `now` kérésenként, a cache-en
 * kívül értékelődik ki, így egy épp elkezdődött időpont azonnal eltűnik, nem
 * csak a cache lejártakor. A `startTime` a cache-ből JSON-ként, stringként jön
 * vissza (a típus ezt nem tükrözi), ezért itt alakítjuk vissza `Date`-té.
 */
export function splitPublicTimeSlots<T extends { startTime: Date | string }>(
  slots: T[],
  now: Date,
): { earlyBird: WithDate<T>[]; normal: WithDate<T>[] } {
  const deadline = new Date(EARLY_BIRD_DATE_DEADLINE);
  const earlyBird: WithDate<T>[] = [];
  const normal: WithDate<T>[] = [];

  for (const slot of slots) {
    const startTime = new Date(slot.startTime);
    const withDate = { ...slot, startTime };

    if (startTime >= deadline) {
      normal.push(withDate);
    } else if (startTime >= now) {
      earlyBird.push(withDate);
    }
  }

  return { earlyBird, normal };
}
