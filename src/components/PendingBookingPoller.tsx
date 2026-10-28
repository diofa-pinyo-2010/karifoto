'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 60_000;

/**
 * Ha a látogató a Stripe-ról hamarabb ér vissza, mint ahogy a webhook lefut,
 * a foglalás még PENDING. Ez a komponens addig kéri újra a szerveroldali
 * renderelést, amíg a státusz meg nem változik — akkor a szülő oldal már nem
 * rendereli, az unmount pedig leállítja a pollingot. CONVERTED-nél az oldal a
 * `BookingCompletedTracker`-t rendereli, így a `booking_completed` event akkor
 * is kimegy, ha a látogató sosem frissít kézzel.
 *
 * Egy perc után feladja: addigra a webhook vagy lefutott, vagy olyan hibára
 * futott, amin a további kérdezgetés nem segít.
 */
export function PendingBookingPoller() {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setTimedOut(true);
    }, POLL_TIMEOUT_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [router]);

  if (!timedOut) return null;

  return (
    <p className="mx-auto mt-4 max-w-125 text-[13px] leading-[1.6] text-pretty text-brand-muted">
      Ez most a szokásosnál tovább tart. A visszaigazolást e-mailben mindenképp
      megkapod.
    </p>
  );
}
