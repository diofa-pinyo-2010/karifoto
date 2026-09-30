import * as z from 'zod';

import { LedgerEntryCategory } from '@/generated/prisma/enums';

/**
 * Every Stripe Checkout Session we create carries a `kind` telling the webhook
 * what the payment *means*. Without it there is only one event type
 * (`checkout.session.completed`) for every payment the studio ever takes, and
 * the handler has to guess.
 *
 * Write it with `satisfies CheckoutMetadata` at the session-creation site and
 * read it only through `parseCheckoutMetadata`, so the two sides cannot drift.
 * There is deliberately no builder function: `satisfies` already rejects a
 * mistyped kind, a missing field and an unknown key, so one would be an
 * identity function dressed up as a seam.
 *
 * The shape below *is* the wire format: Stripe metadata is `string → string`,
 * so the snake_case keys are deliberate and there is no mapping layer to get
 * out of sync.
 */
const bookingDepositMetadata = z.object({
  kind: z.literal('booking_deposit'),
  booking_intent_id: z.string(),
});

// One member today. It stays a discriminated union because the point is the
// growth path: adding `balance` or `selection_extra` here turns every switch
// over `kind` into a compile error until it handles the new case.
export const checkoutMetadataSchema = z.discriminatedUnion('kind', [
  bookingDepositMetadata,
]);

export type CheckoutMetadata = z.infer<typeof checkoutMetadataSchema>;
export type CheckoutKind = CheckoutMetadata['kind'];

export type ParsedCheckoutMetadata =
  | { ok: true; metadata: CheckoutMetadata }
  | { ok: false; reason: string };

/**
 * The ledger category a kind produces, derived in code and **never** stored in
 * the metadata itself. Metadata is written when the session is created and read
 * when the webhook fires, so a category baked into it would go stale the moment
 * the mapping changed. Prices get snapshotted because the client agreed to
 * them; an internal taxonomy does not.
 */
export const CHECKOUT_KIND_LEDGER_CATEGORY: Record<
  CheckoutKind,
  LedgerEntryCategory
> = {
  booking_deposit: LedgerEntryCategory.INCOME_CLIENT_PAYMENT_DEPOSIT,
};

// Read off the raw value rather than the zod error, so an unrecognised kind can
// be named in the Discord alert — "what arrived" is the whole diagnostic.
function readKind(raw: unknown): string | null {
  if (raw == null || typeof raw !== 'object') {
    return null;
  }
  const kind = (raw as Record<string, unknown>).kind;
  return typeof kind === 'string' ? kind : null;
}

export function parseCheckoutMetadata(raw: unknown): ParsedCheckoutMetadata {
  const parsed = checkoutMetadataSchema.safeParse(raw);

  if (parsed.success) {
    return { ok: true, metadata: parsed.data };
  }

  const kind = readKind(raw);
  const subject = kind == null ? 'metadata without a "kind"' : `kind "${kind}"`;
  const issues = parsed.error.issues.map((issue) => issue.message).join('; ');

  return {
    ok: false,
    reason: `Unusable checkout session ${subject}: ${issues}`,
  };
}
