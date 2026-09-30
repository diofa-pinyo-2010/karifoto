# Upcoming work — billing, payments, pricing

Written 2026-09-30, while the site was still behind the coming-soon gate with no
real bookings taken. Everything here is **decided but unbuilt**, or **open**.
Anything already built is described in the other docs in this folder.

The ordering principle throughout: this is a seasonal business. Shootings run
November–December, so each item is ranked by **the date a real customer first
needs it**, not by how interesting it is. Anything not needed before the season
is a January problem.

## Table of Contents

- [Priority order](#priority-order)
- [Status machine — what changed since this doc was written](#status-machine--what-changed-since-this-doc-was-written)
- [1. Invoice wrappers](#1-invoice-wrappers)
- [2. Final invoice (végszámla) generation](#2-final-invoice-végszámla-generation)
- [3. SumUp and `PaymentAttempt`](#3-sumup-and-paymentattempt)
- [4. `calculateRemainingAmount` → breakdown (done)](#4-calculateremainingamount--breakdown)
- [5. `PriceAdjustment` needs a surcharge](#5-priceadjustment-needs-a-surcharge)
- [6. The next checkout kind](#6-the-next-checkout-kind)
- [7. Rounding, if VAT ever stops being AAM](#7-rounding-if-vat-ever-stops-being-aam)
- [Open questions](#open-questions)

## Priority order

| #   | Item                                                   | First needed                              |
| --- | ------------------------------------------------------ | ----------------------------------------- |
| 1   | Balance payment (cash / SumUp) + final invoice + email | **Day of the first shooting**             |
| 2   | Send raw images → client for selection                 | days after the first shooting             |
| 3   | Portal selection form + extra Stripe checkout          | days after that                           |
| 4   | Final images → send + mark complete                    | 1–2 weeks after the first shooting        |
| 5   | Cancellation (± refund)                                | possible any time; workaroundable by hand |
| 6   | Paginated shooting list + search                       | when volume hurts, ~December              |
| 7   | Photographer / editor payout views                     | end of season — Excel does this fine      |

**Build order is not need order.** Items 2–4 aren't _needed_ until after the
first shooting, but they should be built in October: shipping webhook or payment
changes while money is flowing is the worst version of that work.

Tests are not a separate line item. Write them as part of whatever money path
you are touching — see [pricing.test.ts](../server/pricing.test.ts) and
[pricing-snapshot.test.ts](../lib/pricing-snapshot.test.ts) for the two
conventions already established (one must **not** import `constants.ts`, the
other must, and both say why in a comment).

## Status machine — what changed since this doc was written

`PhotoShootingStatus` gained three members and lost one name. Read this before
section 2, because the végszámla job sits inside this workflow.

| status                        | meaning                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| `WAITING_FOR_BALANCE_PAYMENT` | the shooting has started and the balance is collectable — cash or SumUp, in person |
| `WAITING_FOR_EXTRA_PAYMENT`   | was `WAITING_FOR_PAYMENT`; extras owed after delivery, **Stripe only**             |
| `READY_TO_COMPLETE`           | everything delivered and paid, waiting for a human to confirm                      |
| `CANCELLED`                   | was `CLOSED`, which always meant cancelled; `closedAt` is now `cancelledAt`        |

Three rules the code enforces, in
[photo-shooting-status.ts](../server/photo-shooting-status.ts):

- **The two payment gates ask different questions.** `toBePaid > 0` alone cannot
  tell the balance from the extras, so the first gate also requires that no
  `INCOME_CLIENT_PAYMENT_BALANCE` row exists yet. Without that, a completed
  shooting whose client orders extra images falls back into the balance state
  and gets offered cash and card for money that must go through Stripe.
- **Delivery is deliberate.** A final images URL no longer flips the shooting to
  `COMPLETED` and emails the client, because a wrong URL had no correction path.
  The confirmation gate sits _after_ the extra-payment check — moving it above
  turns two tests red, since staff would be invited to send images to a client
  who still owes for them.
- **`CANCELLED` is off the rank scale.** It is an exit from the workflow, not the
  end of it. `PHOTO_SHOOTING_STATUS_RANK` and both ordering helpers are typed on
  `PhotoShootingWorkflowStatus`, which excludes it, so the compiler forces every
  caller to dispose of cancellation before asking whether one status precedes
  another. A new _workflow_ status still fails to compile until it is ranked.

### Both new gates are dead ends today

**Nothing writes `completedAt` or `cancelledAt`.** So a shooting reaches
`READY_TO_COMPLETE` and stops there — `COMPLETED` is unreachable — and
`CANCELLED` is unreachable entirely. Two pieces of wiring are missing:

- the **Lezárás** button in [BalancePayment](../components/BalancePayment.tsx):
  send the final-images email, stamp `completedAt`, and only then let the status
  advance. Deriving the status from a `SentEmail` row instead of the column was
  considered and rejected; with a column, a failed Resend call leaves the
  shooting marked complete, so whatever sets `completedAt` must do it _after_
  the email is accepted.
- cancellation itself (priority 5), which stamps `cancelledAt` and decides the
  refund.

## 1. Invoice wrappers

`@halftome/szamlazz-client` is currently installed from a **fork branch** that
adds `advanceInvoice`, `finalInvoice` and `advanceInvoiceNumber`. See the
warning at the top of [README.md](../../README.md) before touching the
dependency.

**Remove the hardcode first.** `advanceInvoice: true` is currently pinned inside
[szamlazz-client.ts](../lib/invoice/szamlazz-client.ts) — committed as
"hardcode advanceInvoice temp". That is the transport adapter deciding the
document type, so while it stands, _every_ invoice is an előlegszámla, including
the végszámla built in step 2.

Replace it with two methods on `InvoiceClient`:

```ts
generateAdvanceInvoice(input: GenerateInvoiceInput): Promise<GeneratedInvoice>
generateFinalInvoice(
  input: GenerateInvoiceInput,
  advanceInvoiceNumber: string,   // required — not an optional field
): Promise<GeneratedInvoice>
```

Making the advance number a **required parameter** is the whole point. The
szamlazz API does reject a `vegszamla` with no `elolegSzamlaszam` (there is a
test for it in the fork), so this is defence in depth rather than the only
guard — but it fails at compile time instead of at a customer's till.

`GenerateInvoiceInput` also needs `completionDate`. It is currently hardcoded to
`now`, which is _correct_ for an előlegszámla — the tax point of an advance is
the day the money arrives — and _wrong_ for a végszámla, where teljesítés is the
shooting date.

## 2. Final invoice (végszámla) generation

Four things are easy to get wrong, in rough order of how expensive they are:

1. **List the full price, not the remainder.** szamlazz deducts the referenced
   advance itself. Listing the remainder deducts it twice and under-bills.
2. **Use a new idempotency key.** `claimDepositInvoice` in
   [idempotency.ts](../lib/idempotency.ts) is keyed on `deposit_inv:<shootingId>`
   — shooting id alone. Reusing that helper would let the deposit invoice block
   the final one forever. It needs its own key, e.g. `final_inv:<shootingId>`.
3. **`Invoice` needs an advance → final link**, so the job can find which
   előlegszámla it is settling. Shape it like the existing `stornoOf`
   self-relation rather than storing a bare invoice-number string, so it cannot
   point at a document that does not exist.

**Known limitation:** the végszámla only auto-deducts the _one_ advance it
references. If a shooting ever takes a second partial payment before the final
invoice, the document's arithmetic will not match
`calculateRemainingAmount`. Either enforce one-advance-one-final, or compute the
invoice total from the referenced advance rather than from total payments.

## 3. SumUp and `PaymentAttempt`

The balance is paid in the studio, in cash or by card on a SumUp terminal.
**No Stripe is involved.** The intended design is that the app starts a
`PaymentAttempt` with the calculated amount, and SumUp's webhook creates the
`LedgerEntry` and publishes the invoice + email jobs — so nobody types an amount
by hand and reconciles afterwards.

### A local record is mandatory, not a design preference

For terminal payments over the Cloud API, the correlation key is
`client_transaction_id`, and **SumUp generates it** — it comes back in the
Create Checkout response. Unlike Stripe metadata or SumUp's _online_
`checkout_reference`, you cannot stamp your own id onto it. The mapping has to
be persisted locally. That is `PaymentAttempt`.

### The webhook is thin

```json
{
  "id": "…",
  "event_type": "solo.transaction.updated",
  "payload": {
    "client_transaction_id": "…",
    "merchant_code": "M1234567",
    "status": "successful | failed",
    "failure_reason": "…"
  },
  "timestamp": "…"
}
```

- **No amount.** The `LedgerEntry` amount comes from the `PaymentAttempt`, never
  from the webhook.
- `status` can be `failed`, so `PaymentAttempt` needs at least
  PENDING / SUCCEEDED / FAILED plus a TTL for "the client walked away" — the
  same problem `BookingIntent` already solves.
- `transaction_id` is **deprecated**; use `client_transaction_id`.
- The envelope `id` is the idempotency key — same Redis `SET NX` treatment as
  Stripe's `event.id`.
- To capture the SumUp fee and net, read the transaction back over the API after
  success. That is also where the amount can be verified against the attempt.

### This is when `LedgerEntry.provider` earns its place

A `provider` column was drafted and reverted in September 2026 as premature,
because the Stripe webhook was the only ledger writer and every row was
therefore Stripe. SumUp is the first non-Stripe writer, and SumUp card and
Stripe card are **both** `method: CARD` — `provider` is the only thing that can
tell them apart. Bring back `provider`, `externalId`, `externalGroupId`,
`netInCents`, `occurredAt`, `EXPENSE_PAYMENT_PROCESSING` and
`@@unique([provider, externalId])` with this work.

Note `occurredAt` was drafted as required with no default; adding it to a table
with existing rows needs `@default(now())` or a backfill in hand-written SQL.

### Known gap: ad-hoc terminal charges

A charge typed straight into the terminal has no `client_transaction_id` the app
issued, so it probably never reaches the webhook at all. **Any money taken that
way is invisible to the ledger**, so revenue figures from the app understate it
and the szamlazz invoice has to be issued by hand. Decide consciously whether
that is acceptable; if it becomes routine, the Transactions API is the answer,
as a periodic reconciliation sweep rather than a webhook.

### Should Stripe adopt `PaymentAttempt` too?

`PaymentAttempt` is essentially a general "checkout request" record, and Stripe
could use it as well — its metadata would shrink to `{ payment_attempt_id }`.
`BookingIntent` already plays that role for deposits. **Do not migrate the
Stripe path during the season.** The deposit flow works and is covered at the
metadata layer; October is the window for that refactor, not December.

## 4. `calculateRemainingAmount` → breakdown

**Built — 2026-09-30.** Kept here because section 2 depends on it and because
two decisions are easier to find than to rediscover.

[`calculatePricing()`](../server/pricing.ts) returns the itemised bill;
`calculateRemainingAmount()` survives as a one-line view over its
`totalToBePaid`, so `resolveStatus` did not have to change. Three consumers now
share one source of truth: the admin pricing rows, a végszámla's line items, and
the SumUp payment amount.

**Everything is signed.** Charges are positive, adjustments negative, and
`lines` always sums to `totalToBeInvoiced` — that identity is the first test in
[pricing.test.ts](../server/pricing.test.ts). `totalAdjustments` is signed too,
so `totalToBeInvoiced = totalCharges + totalAdjustments`. This deviates from the
`charges − adjustments` sketch this section originally carried, and it is why
section 5 is now a much smaller job: a surcharge is simply a positive amount.

**A line is emitted only when it costs something**, so nothing renders or
invoices a 0 Ft row — except the package and studio fee, which always apply.
That removed the old "Fényjáték ára: 0 Ft" and "Kis kedvencek (0)" rows from the
admin page. `PriceLine.adjustmentId` is set on adjustment lines so the admin page
can hang its note tooltip and delete button on those rows only; an invoice
ignores it.

Wiring the admin page to these lines fixed a **second** instance of the original
bug: extra edited and retouched images were missing from the displayed rows
entirely while being counted in the total, so the list silently failed to sum
whenever either was non-zero. Nobody had noticed because the image-selection
flow is unbuilt and those fields are still zero in practice.

## 5. `PriceAdjustment` needs a surcharge

`PriceAdjustmentType` has `DISCOUNT` and `DEDUCTION` — two labels for one
behaviour, because every adjustment is negated unconditionally. There is no way
to charge a client more, e.g. for something broken in the studio.

Add a `SURCHARGE` member and give each type a sign, mirroring
`LEDGER_ENTRY_CATEGORY_SIGN`:

```ts
export const PRICE_ADJUSTMENT_TYPE_SIGN: Record<PriceAdjustmentType, 1 | -1> = {
  DISCOUNT: -1,
  DEDUCTION: -1,
  SURCHARGE: 1,
};
```

This works because `createPriceAdjustment` already rejects `amountHuf <= 0`, so
amounts are positive magnitudes and the sign lives in exactly one place. Keep
that invariant.

**Section 4 made this a much smaller job.** The sign is now applied in exactly
one expression — the `-adjustment.amountInCents` that builds the adjustment
lines in [`calculatePricing`](../server/pricing.ts). Replace that negation with
the sign map and every consumer follows, because they all read the same lines.
The admin page's old hardcoded `amountInCents * -1` is already gone.

Two things still change, neither of them loud:

1. That negation in `calculatePricing`.
2. `AddPriceAdjustmentDialog`, whose description says the amount "levonásra
   kerül a végösszegből" — untrue for a surcharge.

`PRICE_ADJUSTMENT_TYPE_LABEL` is an exhaustive `Record`, so that one _will_ fail
to compile — it is the only loud one. The `subtracts a DEDUCTION exactly like a
DISCOUNT` test in [pricing.test.ts](../server/pricing.test.ts) is the tripwire:
it goes red when the semantics move, and tells you the change landed.

The dialog renders `Object.values(PriceAdjustmentType)`, so a new type appears
on the pre-payment booking-intent page too. Damage happens at the shoot, not
before checkout, so that dialog probably wants an `allowedTypes` prop.

Adding a surcharge to a `COMPLETED` shooting correctly reopens
`WAITING_FOR_PAYMENT` with no extra work, since `resolveStatus` gates on
`remaining > 0` and `recalculatePhotoShootingStatus` already runs on adjustment
create/delete.

Open: if a surcharge lands _after_ the deposit invoice, does it go on the
végszámla or need its own document? That is a szamlazz question, not a schema
one.

## 6. The next checkout kind

[checkout-metadata.ts](../lib/checkout-metadata.ts) currently has one kind,
`booking_deposit`. The next one is **`selection_extra`** — the client picking
more images than their allowance and paying the difference through Stripe
Checkout (see [image-selection.md](./image-selection.md), step 4).

`balance` is **not** a checkout kind and never will be: the balance is paid in
cash or on SumUp, never through Stripe. The unknown-kind test in
`checkout-metadata.test.ts` deliberately uses `'balance'` as its fixture for
that reason.

Adding a kind is compiler-guided: a new member of `checkoutMetadataSchema`
breaks the build until it has a case in the webhook's switch and an entry in
`CHECKOUT_KIND_LEDGER_CATEGORY`. Add all the pieces in one PR.

## 7. Rounding, if VAT ever stops being AAM

Everything is invoiced at `NamedVATRate.AAM` today, so
[line-items.ts](../lib/invoice/line-items.ts) never divides by anything but 1
and the numbers stay whole by accident. The `27` branch of `VATRate` is
currently dead code. The moment it is not:

**Round exactly one number and derive the rest.** Rounding net, tax and gross
independently makes them stop summing, and szamlazz rejects a line whose totals
do not add up — the fork's own test suite has a case for that error.

Round the **unit** net, never the total:

```ts
const netUnitPrice = Math.round(item.unitPriceGross / (1 + vat / 100));
const netAmount = netUnitPrice * quantity; // not Math.round(totalGross / 1.27)
const grossAmount = item.unitPriceGross * quantity;
const taxAmount = grossAmount - netAmount; // keep deriving this
```

Why the order matters — 1 000 Ft/unit at 27%, quantity 3:

|                           | round the unit | round the total         |
| ------------------------- | -------------- | ----------------------- |
| `netUnitPrice`            | 787            | 787.40 ← not an integer |
| `netAmount`               | 2 361          | 2 362                   |
| `netUnitPrice × quantity` | 2 361 ✓        | 2 362.20 ≠ 2 362 ✗      |

Rounding the total produces a fractional unit price **and** breaks
`unitPrice × quantity = netAmount`, which szamlazz is likely to validate.
Rounding the unit keeps both identities — `net + tax = gross` and
`unit × qty = total` — with the leftover forint landing in tax, which is the
normal outcome.

**Check `simpleItems` first.** The `fejlec` xsd has a `simpleItems` boolean at
position 27 that the client does not model. If it means szamlazz derives net and
tax from a gross price itself, that beats rounding by hand: their arithmetic is
the one that has to satisfy their own validator.

Two tests change when this lands. `keeps net + tax exactly equal to gross` in
[line-items.test.ts](../lib/invoice/line-items.test.ts) is currently
_unfalsifiable_ — tax is derived by subtraction, so it cannot fail — and only
becomes load-bearing once rounding is introduced. A second assertion,
`netUnitPrice × quantity === netAmount`, would need adding.

Whether whole forints are a legal requirement or merely universal convention is
a könyvelő question, but it does not change any of the above: szamlazz enforces
the arithmetic regardless.

## Open questions

- **Is the deposit legally an _előleg_ or a _foglaló_?** They are treated
  differently, and the app currently issues an előlegszámla for it. Nothing is
  live yet, so changing the document type is free right now; once real számla
  numbers exist it is a storno exercise. **Ask before the season opens.**
- **Does an AAM (alanyi adómentes) business need the advance/final pair at
  all?** Invoices are issued at `NamedVATRate.AAM`, so there is no VAT to time,
  which makes the question about document semantics rather than tax points — and
  may change the answer.
- **Does SumUp get a real API integration, or does staff record payments by
  hand?** The design above assumes the former. It is much more work, and the
  answer changes everything in section 3.
- **Ad-hoc SumUp charges** — accept an incomplete ledger, or reconcile via the
  Transactions API?
- **Should the Stripe path move onto `PaymentAttempt`?** If yes, October, not
  December.
