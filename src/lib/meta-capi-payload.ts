import { createHash } from 'node:crypto';

import { toPurchaseValue } from '@/lib/booking-tracking';

import type { PurchaseValue } from '@/lib/booking-tracking';

/**
 * One server event for the Meta Conversions API. Only the fields we send are
 * typed; see Meta's "Server Event Parameters" reference for the rest.
 */
export type MetaPurchaseEvent = {
  event_name: 'Purchase';
  event_id: string;
  event_time: number;
  action_source: 'website';
  event_source_url: string;
  user_data: {
    /** SHA-256 of the trimmed, lowercased email — never the plain address. */
    em: [string];
    fbp?: string;
    fbc?: string;
    client_ip_address?: string;
    client_user_agent?: string;
  };
  custom_data: PurchaseValue;
};

/** The `BookingIntent` fields the event is built from. */
export type MetaPurchaseBookingIntent = {
  email: string;
  marketingConsent: boolean;
  fbp: string | null;
  fbc: string | null;
  clientIp: string | null;
  userAgent: string | null;
};

export function hashEmail(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

/**
 * The server-side twin of the success page's `booking_completed` event.
 *
 * - `event_id` is the `PhotoShooting.id`, exactly as in the browser event —
 *   Meta merges the two only when `event_name` and `event_id` both match.
 * - `custom_data` comes from `toPurchaseValue()`, the same helper the browser
 *   event uses, fed with `bookingPurchaseTotalInCents()`.
 *
 * Returns `null` without marketing consent. The server call bypasses the
 * cookie banner, so this check is what keeps it compliant — nothing is built
 * for a visitor who did not opt in.
 */
export function buildMetaPurchaseEvent({
  bookingIntent,
  photoShootingId,
  totalToBeInvoicedInCents,
  eventSourceUrl,
  now = new Date(),
}: {
  bookingIntent: MetaPurchaseBookingIntent;
  photoShootingId: string;
  totalToBeInvoicedInCents: number;
  eventSourceUrl: string;
  now?: Date;
}): MetaPurchaseEvent | null {
  if (!bookingIntent.marketingConsent) return null;

  const { fbp, fbc, clientIp, userAgent } = bookingIntent;

  return {
    event_name: 'Purchase',
    event_id: photoShootingId,
    event_time: Math.floor(now.getTime() / 1000),
    action_source: 'website',
    event_source_url: eventSourceUrl,
    user_data: {
      em: [hashEmail(bookingIntent.email)],
      ...(fbp != null && { fbp }),
      ...(fbc != null && { fbc }),
      ...(clientIp != null && { client_ip_address: clientIp }),
      ...(userAgent != null && { client_user_agent: userAgent }),
    },
    custom_data: toPurchaseValue(totalToBeInvoicedInCents),
  };
}

/**
 * Whether — and how — this deployment may send to Meta. Production sends
 * live events. Anywhere else nothing is sent, unless a test event code is set:
 * then events carry `test_event_code` and only show up in Events Manager's
 * Test Events view. A test code set in production routes production events
 * there too, which is how the live deduplication is checked by hand.
 */
export function resolveMetaCapiMode({
  vercelEnv,
  testEventCode,
}: {
  vercelEnv: string | undefined;
  testEventCode: string | undefined;
}): { send: false } | { send: true; testEventCode?: string } {
  if (testEventCode) return { send: true, testEventCode };
  if (vercelEnv === 'production') return { send: true };
  return { send: false };
}
