'use client';

import { useEffect } from 'react';

import { bookingCompletedStorageKey } from '@/lib/booking-tracking';

import type { BookingCompletedEvent } from '@/lib/booking-tracking';

// Ugyanabban a page loadban (StrictMode dupla effektje, újrarenderelés,
// kliensoldali vissza-navigáció) ez véd, ha a localStorage nem elérhető.
const pushedEventIds = new Set<string>();

/**
 * Foglalásonként egyszer küldi a `booking_completed` eventet a dataLayerbe.
 * Consenttől függetlenül: hogy melyik tag futhat rá, azt a GTM dönti el.
 *
 * Reload és a böngésző vissza gombja ellen a localStorage-ba írt jelölő véd.
 * Ha a storage nem elérhető (privát mód, letiltott site data), marad az
 * in-memory jelölő — ilyenkor egy reload újra küldheti, de az `event_id`
 * azonos, így a Meta deduplikálja.
 */
export function BookingCompletedTracker({
  event,
}: {
  event: BookingCompletedEvent;
}) {
  useEffect(() => {
    const key = bookingCompletedStorageKey(event.event_id);
    if (pushedEventIds.has(event.event_id)) return;
    try {
      if (localStorage.getItem(key) != null) return;
    } catch {
      // A storage nem olvasható — az in-memory jelölőre hagyatkozunk.
    }

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ ...event });
    pushedEventIds.add(event.event_id);

    try {
      localStorage.setItem(key, '1');
    } catch {
      // Lásd fent.
    }
  }, [event]);

  return null;
}
