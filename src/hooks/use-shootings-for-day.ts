'use client';

import { useEffect, useState, useTransition } from 'react';

import { fromBudapestDayAndTime, getBudapestDayKey } from '@/lib/utils';
import {
  getPhotoShootingsForDay,
  type PhotoShootingsForDay,
} from '@/server/photo-shootings';

// The shootings on `date`'s Budapest calendar day. Refetches only when the day
// changes, not the time; pass `undefined` to skip fetching (e.g. while closed).
export function useShootingsForDay(
  date: Date | undefined,
  excludeShootingId?: string,
) {
  const [shootings, setShootings] = useState<PhotoShootingsForDay[]>();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startLoading] = useTransition();
  const dayKey = date ? getBudapestDayKey(date) : undefined;

  useEffect(() => {
    if (!dayKey) return;
    // A slower response for a previously picked day must not overwrite this one.
    let ignore = false;
    startLoading(async () => {
      try {
        // Any instant inside the Budapest day works for `dayBounds` on the server.
        const data = await getPhotoShootingsForDay(
          fromBudapestDayAndTime(dayKey, '12:00'),
          excludeShootingId,
        );
        if (ignore) return;
        setShootings(data);
        setError(null);
      } catch (e) {
        console.error(e);
        if (!ignore) setError('Nem tudjuk betölteni a foglalásokat.');
      }
    });
    return () => {
      ignore = true;
    };
  }, [dayKey, excludeShootingId]);

  return { shootings, isLoading, error };
}
