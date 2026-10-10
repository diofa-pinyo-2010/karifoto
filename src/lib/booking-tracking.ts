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
 */
export type BookingCompletedEvent = {
  event: typeof GTM_EVENTS.bookingCompleted;
  event_id: string;
  /** Whole forints, as the ad platforms expect — not fillér. */
  value: number;
  currency: 'HUF';
};

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
    value: centsToHuf(totalToBeInvoicedInCents),
    currency: 'HUF',
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
