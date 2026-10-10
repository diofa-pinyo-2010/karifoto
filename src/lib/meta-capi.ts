import { env } from '@/env';
import {
  buildMetaPurchaseEvent,
  resolveMetaCapiMode,
} from '@/lib/meta-capi-payload';
import { getCreatedShooting } from '@/lib/queries';
import { bookingPurchaseTotalInCents } from '@/server/pricing';

import type { MetaPurchaseBookingIntent } from '@/lib/meta-capi-payload';

/** Graph API version of the Conversions API endpoint. */
const META_GRAPH_API_VERSION = 'v26.0';
/** Kept short: the call sits inline in the Stripe webhook. */
const META_CAPI_TIMEOUT_MS = 3_000;

/**
 * Sends the booking's server-side Purchase to the Meta Conversions API — the
 * twin of the browser Pixel Purchase GTM fires from `booking_completed`, which
 * is lost when the tab is closed after paying or an ad blocker is on. Meta
 * deduplicates the two on `event_name` + `event_id` (the `PhotoShooting.id`).
 *
 * Call it only once the shooting, its price adjustments and its ledger entry
 * are written, so the value is computed from the same rows the success page
 * reads.
 *
 * **Never throws.** Ad measurement must not fail a paid booking: errors are
 * logged and swallowed, there is no in-process retry, and a Stripe webhook
 * retry merely resends an event Meta drops as a duplicate. Logs carry ids
 * only — never the token, the email or the IP address.
 */
export async function sendBookingPurchaseToMeta({
  bookingIntentId,
  bookingIntent,
}: {
  bookingIntentId: string;
  bookingIntent: MetaPurchaseBookingIntent;
}): Promise<void> {
  try {
    // No consent: nothing is sent, nothing is even read.
    if (!bookingIntent.marketingConsent) return;

    const mode = resolveMetaCapiMode({
      vercelEnv: env.NEXT_PUBLIC_VERCEL_ENV,
      testEventCode: env.META_CAPI_TEST_EVENT_CODE,
    });
    if (!mode.send) return;

    const pixelId = env.META_PIXEL_ID;
    const accessToken = env.META_CAPI_ACCESS_TOKEN;
    if (pixelId == null || accessToken == null) return;

    const shooting = await getCreatedShooting(bookingIntentId);
    if (shooting?.pricing == null) {
      console.error('[meta-capi] no shooting with pricing, skipping', {
        bookingIntentId,
      });
      return;
    }

    const event = buildMetaPurchaseEvent({
      bookingIntent,
      photoShootingId: shooting.id,
      totalToBeInvoicedInCents: bookingPurchaseTotalInCents({
        ...shooting,
        pricing: shooting.pricing,
      }),
      eventSourceUrl: `${env.NEXT_PUBLIC_SITE_URL}/success/${bookingIntentId}`,
    });
    if (event == null) return;

    // The token goes in the body, not the query string, so it cannot end up
    // in a logged URL.
    const res = await fetch(
      `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${encodeURIComponent(pixelId)}/events`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [event],
          access_token: accessToken,
          ...(mode.testEventCode != null && {
            test_event_code: mode.testEventCode,
          }),
        }),
        signal: AbortSignal.timeout(META_CAPI_TIMEOUT_MS),
      },
    );

    if (!res.ok) {
      // Meta's error body names the problem (bad token, malformed field)
      // without echoing the user data back.
      console.error('[meta-capi] Purchase rejected', {
        bookingIntentId,
        eventId: event.event_id,
        status: res.status,
        body: await res.text().catch(() => null),
      });
      return;
    }

    console.log('[meta-capi] Purchase sent', {
      bookingIntentId,
      eventId: event.event_id,
      test: mode.testEventCode != null,
    });
  } catch (err) {
    // Only the error's name and message: a fetch error could otherwise carry
    // the request (and the token in its body) into the logs.
    console.error('[meta-capi] Purchase failed', {
      bookingIntentId,
      error:
        err instanceof Error ? `${err.name}: ${err.message}` : 'unknown error',
    });
  }
}
