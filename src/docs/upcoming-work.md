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
- [1. Invoice wrappers (done)](#1-invoice-wrappers)
- [2. Final invoice (végszámla) generation (done)](#2-final-invoice-végszámla-generation)
- [3. SumUp and `PaymentAttempt`](#3-sumup-and-paymentattempt)
- [4. `calculateRemainingAmount` → breakdown (done)](#4-calculateremainingamount--breakdown)
- [5. `PriceAdjustment` needs a surcharge](#5-priceadjustment-needs-a-surcharge)
- [6. The next checkout kind](#6-the-next-checkout-kind)
- [7. Rounding, if VAT ever stops being AAM](#7-rounding-if-vat-ever-stops-being-aam)
- [8. Paying the full amount at booking (not building)](#8-paying-the-full-amount-at-booking)
- [Open questions](#open-questions)

## Priority order

| #   | Item                                                 | First needed                              |
| --- | ---------------------------------------------------- | ----------------------------------------- |
| 1   | Balance payment (cash ✅ / SumUp) + final invoice ✅ | **Day of the first shooting**             |
| 2   | Send raw images → client for selection               | days after the first shooting             |
| 3   | Portal selection form + extra Stripe checkout        | days after that                           |
| 4   | Final images → send + mark complete                  | 1–2 weeks after the first shooting        |
| 5   | Cancellation (± refund)                              | possible any time; workaroundable by hand |
| 6   | Paginated shooting list + search                     | when volume hurts, ~December              |
| 7   | Photographer / editor payout views                   | end of season — Excel does this fine      |

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

### Known hole: the balance gate asks a proxy question

The first gate above requires that no `INCOME_CLIENT_PAYMENT_BALANCE` row
exists. What it _means_ to ask is "is the shooting's own price behind us?" The
two agree for every booking that pays a deposit and then settles at the till —
which is every booking today — but they come apart whenever **nothing is ever
collected at the shoot**:

- a `DISCOUNT` covering the entire remaining balance, so `totalToBePaid` is
  already 0 when the shooting starts and no balance row is ever written;
- paying the whole amount at booking, if [section 8](#8-paying-the-full-amount-at-booking)
  is ever built.

Then the client orders extra images. `totalToBePaid > 0` and still no balance
row, so `resolveStatus` returns `WAITING_FOR_BALANCE_PAYMENT` instead of
`WAITING_FOR_EXTRA_PAYMENT`. The admin page offers **Készpénz / Bankkártya** for
money that must go through Stripe — and
[`resolveCashBalancePayment()`](../server/balance-payment-guard.ts) _accepts_ it,
because its guard asks the same proxy question.

So the clause is right and the predicate is a proxy. The discount route is
reachable today — it needs a discount equal to the whole remaining balance,
which is what a free shoot for a friend or an influencer looks like.

**The two causes do not share a fix**, which is worth stating because the
opposite was briefly written here. Section 8's `SETTLES_BALANCE` record only
helps when a settling payment _exists_ to be recognised; in the discount case
nothing is ever paid at the shoot, so no map over ledger categories can see it.
Fixing the discount hole means the gate must stop reading the ledger for a
question the ledger cannot answer. Three candidates, none free:

| candidate                                                                                                | fixes discount | fixes §8 | cost                                                                                                                    |
| -------------------------------------------------------------------------------------------------------- | -------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| Gate on delivery instead: `rawImagesUrl == null && toBePaid > 0`                                         | yes            | yes      | no schema change, but if staff upload raw images **before** taking the cash, the shooting offers Stripe for the balance |
| A `balanceSettledAt` column, stamped when the balance stage closes — by payment, by discount, or by hand | yes            | yes      | a migration and a writer on three paths; says what it means, so nothing has to be inferred                              |
| `SETTLES_BALANCE` record                                                                                 | **no**         | yes      | one map plus a one-line predicate                                                                                       |

The delivery gate is tempting because it is free, and its failure mode is the
mirror image of today's: today a settled shooting can be offered cash it does
not owe, and there it would be a genuinely owed balance offered through the
wrong rail. `balanceSettledAt` is the honest version — "is the balance stage
behind us" is a fact about the workflow, not something derivable from which
rows happen to exist.

**Undecided, and deliberately so.** The hole is narrow and needs a deliberate
full-value discount to reach, so it is not worth a rushed schema change during
the season. Pick one before the first free shoot, not after.

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

**Built.** `InvoiceClient` has the three methods, and the
`advanceInvoice: true` hardcode is gone from
[szamlazz-client.ts](../lib/invoice/szamlazz-client.ts) — the document type is
chosen by _which method you call_:

```ts
generateInvoice(input: GenerateInvoiceInput): Promise<GeneratedInvoice>
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

`GenerateInvoiceInput` gained `paymentMethod` with the balance work, mapped to
szamlazz's `fizmod` by
[payment-method.ts](../lib/invoice/payment-method.ts) — its own file, because
`szamlazz-client.ts` builds an `SZClient` from `env` at import time and would
drag the environment into a test about a lookup table.

**`completionDate` stays `now` by decision, not oversight.** Every payment in
this flow is instant — the deposit through Stripe, the balance at the till — so
the tax point and the payment date coincide, and `issue()` pins all three dates
to `now`. Revisit when a payment's tax point stops being its payment date — a
balance collected on a day other than the shooting would do it. (Section 8 would
have, but it is not being built.)

## 2. Final invoice (végszámla) generation

**Built — 2026-10-01**, together with the cash balance payment. Three things
were easy to get wrong, and all three are now enforced rather than remembered:

1. **List the full price _and_ the advance as a negative line.** This was
   written down backwards here and shipped that way: szamlazz does **not**
   deduct the referenced advance. `fejlec.elolegSzamlaszam` only links the two
   documents. A végszámla's required content is the full price positive plus
   the already-paid advance negative, so the total is what is still owed —
   65 000 − 10 000 = 55 000. Without the negative line the document asks for
   the full price again, i.e. bills the client twice.
   [`buildFinalInvoiceItems()`](../lib/invoice/final-invoice-items.ts) takes the
   settled advance as a **required** parameter for that reason, and its test
   asserts the items total `totalToBeInvoiced − advance`.

   The deducted amount comes from the referenced `Invoice.amountInCents`, never
   from `breakdown.totalPaid`: by the time the job runs, the balance payment is
   already a ledger row, so `totalToBePaid` is 0. The job also compares the
   document's total against the payment just taken and warns on Discord if they
   disagree — that mismatch is how a price change between till and invoice
   shows up.

2. **A separate idempotency key.** `final_inv:<shootingId>`, with its own
   claim / confirm / release trio in [idempotency.ts](../lib/idempotency.ts).
   `deposit_inv:` is keyed on shooting id alone, so reusing it would have let
   the deposit invoice block the final one for a full 30 days.
3. **`Invoice` knows what it is and what it settles.** `Invoice.type`
   (`NORMAL` | `ADVANCE` | `FINAL` | `STORNO`) is non-null with **no default**,
   so every `invoice.create` must state the document kind; and
   `advanceInvoiceId` is a `@unique` self-relation shaped like `stornoOf`.

The `@unique` is what closes the old known limitation: **one advance, one
final**, enforced in Postgres. A second végszámla against the same
előlegszámla fails with `P2002` instead of quietly producing a document whose
arithmetic disagrees with `calculatePricing`. A shooting that somehow needs a
second partial payment before the final invoice is now a deliberate schema
change, not an accident.

The line items keep negative amounts for discounts — that is how szamlazz
represents a deduction — and leading emoji are stripped from labels, since
`✨ Fényjáték` reads fine on the admin page but not on a tax document.

Flow: `recordCashBalancePayment` ([balance-payment.ts](../server/balance-payment.ts))
writes the `LedgerEntry`, publishes `generate-final-invoice`, then
recalculates the status. The job
([route.ts](../app/api/jobs/generate-final-invoice/route.ts)) finds the
`ADVANCE` invoice, claims, issues, confirms, and only then writes the `Invoice`
row — the same ordering as the deposit job, and for the same reason.

## 3. SumUp and `PaymentAttempt`

The balance is paid in the studio, in cash or by card on a SumUp terminal.
**No Stripe is involved.** The intended design is that the app starts a
`PaymentAttempt` with the calculated amount, and SumUp's webhook creates the
`LedgerEntry` and publishes the invoice + email jobs — so nobody types an amount
by hand and reconciles afterwards.

**The cash half is built, and it left the invoicing side done.** SumUp's webhook
only has to create its own `LedgerEntry` (`INCOME_CLIENT_PAYMENT_BALANCE`,
`method: 'CARD'`) and publish the same `generate-final-invoice` job with
`{ shootingId, ledgerEntryId }`. The job reads the payment method off the ledger
row, so the végszámla says `bankkártya` with no change to it. The **Bankkártya**
button in [BalancePayment](../components/BalancePayment.tsx) is disabled and
waiting for exactly that.

Note the cash path deliberately has **no** `PaymentAttempt`: there is no
terminal round-trip to correlate, so
[`resolveCashBalancePayment()`](../server/balance-payment-guard.ts) recomputes
the amount server-side and refuses if an `INCOME_CLIENT_PAYMENT_BALANCE` row
already exists. That refusal, plus the partial unique index behind it, is the
double-submit guard — a cash row has no `paymentIntent`, so the unique column
that guards the Stripe path does not apply.

**Small cleanup owed here:** that guard hand-rolls its own `.some()` over the
ledger instead of calling [`isBalanceCollected()`](../lib/utils.ts), which
`resolveStatus` uses for the same question. One of them decides the status and
the other decides whether to take cash; they must not be able to drift apart.

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

[`calculatePricing()`](../server/pricing.ts) returns the itemised bill. It
replaced `calculateRemainingAmount()` entirely — that function survived for a
while as a one-line view over `totalToBePaid`, purely so `resolveStatus` did not
have to change in the same commit, and was **deleted on 2026-10-01** once
everything read the breakdown directly. If you find the name in a doc or an old
comment, it means `calculatePricing(...).totalToBePaid`.

Four consumers now share one source of truth: the admin pricing rows,
`resolveStatus`, a végszámla's line items, and the cash balance amount.

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

`full_payment` was considered and **declined** — see
[section 8](#8-paying-the-full-amount-at-booking). So `selection_extra` really is
the next kind, and the only one on the horizon.

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

## 8. Paying the full amount at booking

**Decided 2026-10-01: not building this.** Nobody has asked for it, so it is
absent from the priority table and nothing below is scheduled. Kept because the
analysis has two durable outputs: it surfaced a bug that is live today (see
[Known hole](#known-hole-the-balance-gate-asks-a-proxy-question)), which stands
on its own and needs its own decision; and it records why the obvious
implementation is a trap, so the next person to propose two ledger rows for one
payment can read the answer instead of re-deriving it.

Nothing here is a prerequisite for anything that _is_ scheduled. If it is ever
picked up, start with the document question at the end — it decides whether this
is a small job or a large one.

Today [`createCheckoutSession`](../server/stripe.ts) charges `DEPOSIT_AMOUNT`
under the line name `'Fotózás előleg'`. "Paying in full" means charging the price
known at booking instead. Note it is only full _as of booking_: edited and
retouched counts are still 0 then, so the extras path survives either way.

### The partial unique index is not the obstacle

`LedgerEntry_one_balance_per_photo_shooting_key` permits at most one balance row,
and paying in full produces **zero** — trivially satisfied. (It would block
splitting one balance across cash and card, but so would the status machine,
where the first balance row closes the gate. That is a separate question.)

### What actually blocks it

1. **The balance gate's proxy**, above — extras would be offered cash.
2. **No végszámla would ever be issued.** The only publisher of
   `generate-final-invoice` is `recordCashBalancePayment`. No balance payment, no
   trigger; the shooting would end with a 100% előlegszámla and no closing
   document.
3. **No ledger category fits.** `..._DEPOSIT` is a lie, and `..._BALANCE` is a
   different lie that muddles what the index means.
4. **Checkout is hardcoded to the deposit**, and the full price is not available
   where the deposit is: `PhotoShootingPricing` is created by the webhook, so a
   session-creation-time amount has to come from `buildPricingSnapshot` +
   `calculatePricing` over the `BookingIntent`.

### One ledger row, not two

Writing a `DEPOSIT` row _and_ a `BALANCE` row for a single payment is the
tempting shortcut — it makes `isBalanceCollected` true with no other change.
It does not work, and it should not:

- `LedgerEntry.paymentIntent` is `@unique` and one session has one payment
  intent, so the second row collides;
- worse, the webhook's `P2002` handler treats a duplicate as
  _"already recorded (retry), skipping"_ and only warns — so you would silently
  get one row and no balance row, the exact failure with no exception to notice;
- [generate-deposit-invoice](../app/api/jobs/generate-deposit-invoice/route.ts)
  looks the row up with `findUnique({ where: { paymentIntent } })`, which assumes
  1:1;
- and one Stripe charge of 65 000 recorded as 10 000 + 55 000, split at a
  hardcoded constant, makes the ledger stop mirroring the money. `LedgerEntry`
  **is** the money record; inventing a second movement to satisfy a status
  predicate is the tail wagging the dog.

So: one row, a new `INCOME_CLIENT_PAYMENT_FULL` category, and a predicate that
knows about it.

### Make the predicate exhaustive, not a list

```ts
// constants.ts, next to LEDGER_ENTRY_CATEGORY_SIGN
export const SETTLES_BALANCE: Record<LedgerEntryCategory, boolean> = {
  INCOME_CLIENT_PAYMENT_DEPOSIT: false,
  INCOME_CLIENT_PAYMENT_BALANCE: true,
  INCOME_CLIENT_PAYMENT_FULL: true,
  INCOME_CLIENT_PAYMENT_EXTRA: false,
  INCOME_OTHER: false,
  // …every EXPENSE_* false
};
```

```ts
// utils.ts — the whole change
export function isBalanceCollected(ledgerEntries: LedgerEntry[]) {
  return ledgerEntries.some((entry) => SETTLES_BALANCE[entry.category]);
}
```

A `Record`, **not** an array with `.includes()`: a new category then fails to
compile until someone decides whether it settles the balance. A list answers
"no" silently, which is precisely how the hole above came to exist. This matches
the four exhaustive records already in `constants.ts`. No import cycle —
`utils.ts` already imports `constants.ts`, not the other way round.

Extend the index's `WHERE` to cover both settling categories at the same time,
so "at most one" keeps meaning what it says.

### The document is the genuinely open part

One normal számla — `Invoice.type: 'NORMAL'` with `advanceInvoiceId` null, both
already supported — carrying `completionDate` = the shooting date is the obvious
answer, and szamlazz accepts a future `teljesitesDatum` without complaint.

Whether it is _correct_ is a könyvelő question, and a pointed one: money
arriving before teljesítés is the textbook definition of an **előleg**, which is
what előlegszámla exists for. The alternative is a 100% előlegszámla at booking
plus a zero-payable végszámla at the shoot — correct by construction, but it
needs blocker 2 solved first (trigger the final invoice from _completion_, not
from payment), and the job needs a different entry contract: it currently keys
on a `ledgerEntryId` and checks the document total against that payment, neither
of which exists when the payable is 0.

AAM weakens the objection considerably — there is no VAT to time — so "one
számla is fine" is a plausible answer. Ask it alongside the first two open
questions below; one conversation settles all three.

### Two consequences to decide

- **`completionDate` comes back into scope.** Section 1 pins it to `now` because
  every payment is instant. That stops holding here. Re-adding it is a field on
  `GenerateInvoiceInput` plus `input.completionDate ?? now` in `issue()`.
- **`readOnlyDetails` flips earlier.** The admin page gates it on the same
  predicate, so a paid-in-full shooting would lock its details at _booking_
  rather than at the shoot. Defensible — the price is fixed — but staff lose the
  ability to correct a guest count afterwards.

## Open questions

- **Is the deposit legally an _előleg_ or a _foglaló_?** They are treated
  differently, and the app currently issues an előlegszámla for it. Nothing is
  live yet, so changing the document type is free right now; once real számla
  numbers exist it is a storno exercise. **Ask before the season opens.**
- **Does an AAM (alanyi adómentes) business need the advance/final pair at
  all?** Invoices are issued at `NamedVATRate.AAM`, so there is no VAT to time,
  which makes the question about document semantics rather than tax points — and
  may change the answer.
- **May a single normal számla cover a payment taken before teljesítés?** This
  gates [section 8](#8-paying-the-full-amount-at-booking): if the answer is no,
  paying in full needs a 100% előlegszámla plus a zero-payable végszámla, which
  is materially more work. Same conversation as the two questions above.
- **Does SumUp get a real API integration, or does staff record payments by
  hand?** The design above assumes the former. It is much more work, and the
  answer changes everything in section 3.
- **Ad-hoc SumUp charges** — accept an incomplete ledger, or reconcile via the
  Transactions API?
- **Should the Stripe path move onto `PaymentAttempt`?** If yes, October, not
  December.
