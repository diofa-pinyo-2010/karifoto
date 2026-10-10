import { GTM_EVENTS } from '@/lib/constants';
import { centsToHuf } from '@/lib/utils';

/**
 * The `booking_completed` dataLayer event, pushed once on the success page when
 * the Stripe webhook has turned the booking into a `PhotoShooting`. GTM decides
 * which tags (GA4, Meta Pixel) may fire on it, so it is pushed regardless of
 * consent and carries no personal data — no name, email or phone.
 *
 * `event_id` **is** the `PhotoShooting.id`. The server already holds that id
 * wherever a booking is created (`shooting.id` in the Stripe webhook), so a
 * Meta Conversions API call sent from there can reuse it as its `event_id` and
 * Meta deduplicates the browser and server events against each other. Do not
 * swap it for a client-generated id: the server could never reproduce it.
 *
 * **Ordering — this shapes the GTM setup.** On the success page the
 * `BookingCompletedTracker` effect runs before the `CookieConsentBanner`
 * effect, so `booking_completed` reaches the dataLayer *before* the consent
 * update and `marketing_consent_granted`, even for a visitor who accepted
 * marketing cookies long ago. A tag that requires `ad_storage` and triggers on
 * `booking_completed` alone is therefore blocked, and GTM never re-runs it.
 * The Purchase / conversion tags must use a **Trigger Group** of
 * `booking_completed` + `marketing_consent_granted`, so they fire once both
 * have happened on the page, in either order. The push order is deliberately
 * left as is: the trigger group handles it, and it holds for any page load.
 */
export type BookingCompletedEvent = {
  event: typeof GTM_EVENTS.bookingCompleted;
  event_id: string;
} & PurchaseValue;

/**
 * The `value` / `currency` pair of a booking's Purchase. Both the browser event
 * above and the server-side Meta Conversions API event
 * ([meta-capi-payload.ts](./meta-capi-payload.ts)) build it here, from the same
 * `bookingPurchaseTotalInCents()`, so Meta sees the same amount from either
 * side and the two can never drift.
 */
export type PurchaseValue = {
  /** Whole forints, as the ad platforms expect — not fillér. */
  value: number;
  currency: 'HUF';
};

export function toPurchaseValue(
  totalToBeInvoicedInCents: number,
): PurchaseValue {
  return { value: centsToHuf(totalToBeInvoicedInCents), currency: 'HUF' };
}

export function buildBookingCompletedEvent({
  photoShootingId,
  totalToBeInvoicedInCents,
}: {
  photoShootingId: string;
  totalToBeInvoicedInCents: number;
}): BookingCompletedEvent {
  return {
    event: GTM_EVENTS.bookingCompleted,
    event_id: photoShootingId,
    ...toPurchaseValue(totalToBeInvoicedInCents),
  };
}

/**
 * The browser-side marker that stops a reload or a back navigation to the
 * success page from pushing the same booking twice. It holds only the
 * shooting's id.
 */
export function bookingCompletedStorageKey(eventId: string) {
  return `karifoto:booking_completed:${eventId}`;
}
