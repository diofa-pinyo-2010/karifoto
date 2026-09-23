import { Stripe } from 'stripe';

import { env } from '@/env';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY);

/** Dashboard links are mode-specific — /test/ doesn't redirect to the live equivalent or vice versa. */
export function stripePaymentIntentUrl(paymentIntentId: string): string {
  const isLiveMode = env.STRIPE_SECRET_KEY.startsWith('sk_live_');
  const base = isLiveMode
    ? 'https://dashboard.stripe.com/payments'
    : 'https://dashboard.stripe.com/test/payments';

  return `${base}/${paymentIntentId}`;
}
