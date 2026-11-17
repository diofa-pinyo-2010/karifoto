# Photo shooting cancellation (± refund) — design

Date: 2026-11-17 · Status: approved

## Intent

Staff need to cancel a booked shooting from the admin shooting page, optionally
giving the client their money back. Today nothing writes
`PhotoShooting.cancelledAt`, so `CANCELLED` is unreachable
([upcoming-work.md](../../../src/docs/upcoming-work.md), priority 5) and every
cancellation is handled by hand in Stripe, szamlazz.hu and the DB.

Success: one button that leaves Stripe, szamlazz.hu, the ledger, the calendar
and the shooting's status consistent, with the refund visible in the stats as
**reduced income**, not as an expense.

## Goals

- "Fotózás lemondása" collapsible at the bottom of `/admin/photo-shootings/[id]`
  (below "Pénzmozgások" and "Elküldött email-ek", closed by default), holding a
  destructive **Lemondás** button.
- The button opens an AlertDialog: a short explanation, a **refund checkbox**
  ("visszakapja a befizetett összeget") and an optional **reason** textarea.
- With refund: full Stripe refund of the single income payment, storno
  (sztornó) of that payment's invoice, a refund ledger row.
- Without refund: only the cancellation itself; the payment and its invoice
  stand.
- Both: `cancelledAt` + `cancellationReason` stamped, status becomes
  `CANCELLED`, Google Calendar event deleted, the shooting becomes read-only.
- Works for gift shootings (`booking_gift`, paid in full) as well as deposits.

## Non-goals

- Cancelling after anything beyond the first payment exists (balance, extra,
  final invoice). Those are refused, not handled.
- Partial refunds / a refund amount field. Always the full payment. Revisit
  when needed.
- Client-facing cancellation email (later; see Open items).
- Handling Stripe `refund.failed` / `refund.updated` webhooks.
- Making the time slot bookable again — it **stays un-revealed** on purpose.
- Un-cancelling.

## Anti-goals

- Money moves but the DB doesn't record it (or vice versa).
- A refund showing up as an expense, or the refunded payment still counting as
  income.
- A second Stripe refund or a second storno from a double click / retry.
- A cancelled shooting still editable through any server action, or a cancelled
  gift still redeemable.

## Constraints (from the codebase)

- Webhook philosophy: transactional work first, ledger before third parties,
  everything else fanned out to QStash jobs (`489 + Upstash-NonRetryable-Error`
  for permanent failures, `throw` for retryable).
- Re-issuing a real szamlazz.hu document is worse than a delay: invoice claims
  in [idempotency.ts](../../../src/lib/idempotency.ts) **throw** when Redis is
  down. The storno claim keeps that stance.
- All amounts in integer fillér; Hungarian user-facing copy; no relative
  imports; env only via `src/env.ts`.
- `cancelledAt != null` already wins over everything in
  [photo-shooting-status.ts](../../../src/server/photo-shooting-status.ts);
  lists, stats and staff fees already exclude `CANCELLED`.
- szamlazz-client fork already has `reverseInvoice(invoiceNumber, opts)`
  (`eInvoice`, `issueDate`, `completionDate`, `downloadPDF`). It cannot storno
  an invoice that was corrected — we never correct, so fine. It has no
  `sendEmail` option.
- Stripe refunds draw on the **available** balance. If it is insufficient, a
  card refund is held `pending` and completes automatically once funds arrive;
  after 45 days it fails with `insufficient_funds`.

## Approaches considered

1. **Everything synchronous in one server action** — simplest, but a
   szamlazz.hu failure after the refund leaves a half-done state with no retry.
2. **Webhook-style orchestrator (chosen)** — the action does the refund + one DB
   transaction, then publishes QStash jobs for storno and calendar. Retries,
   money recorded before third parties, matches existing patterns. Cost: more
   files, storno appears a few seconds later.
3. **Webhook-driven** — action only creates the refund, `charge.refunded`
   webhook does the rest. Most truthful for pending refunds and would catch
   dashboard refunds, but most complex and new event types.

Picked 2.

### Ledger representation (decided: A)

- **A (chosen):** new category `REFUND_CLIENT_PAYMENT`, sign `-1`, but on the
  **income side**. Like every ledger row its amount is stored signed
  (`amount * SIGN`, so negative), which makes income sums net out with no
  special arithmetic. Original payment row untouched.
- B: negative-amount row in the original category — rejected, misleading and
  `paymentIntent` is unique.
- C: delete/zero the original — rejected, loses the audit trail.

## Design

### Schema (one migration)

- `PhotoShooting.cancellationReason String?` next to `cancelledAt`.
- `LedgerEntryCategory.REFUND_CLIENT_PAYMENT`.
- `LedgerEntry.stripeRefundId String? @unique` — the `re_…` id. *(My call:
  `paymentIntent` is unique and already names the original payment, so the
  refund id gets its own column; the unique index is a second line of defence
  against a duplicate row.)* The refund row also stores the same
  `photoShootingId`; `paymentIntent` stays null on it.

### Ledger side vs sign

Today [admin-stats.ts](../../../src/lib/admin-stats.ts) decides income vs
expense from `LEDGER_ENTRY_CATEGORY_SIGN`. Add a separate
`LEDGER_ENTRY_CATEGORY_SIDE: Record<LedgerEntryCategory, 'INCOME' | 'EXPENSE'>`
in `constants.ts`. Three places today decide "is this income?" from the sign or
the `INCOME` name prefix and must switch to the side map: `buildAdminStats`
([admin-stats.ts](../../../src/lib/admin-stats.ts)), `INCOME_CATEGORIES`
([queries.ts](../../../src/lib/queries.ts), which also splits off the expense
list), and `totalPaid` in `calculatePricing`
([pricing.ts](../../../src/server/pricing.ts)). Income = payments − refunds,
expenses unchanged. Every
`Record<LedgerEntryCategory, …>` (sign, label, `SETTLES_BALANCE`, …) gets an
entry — the compiler lists them. Audit every `SIGN[...] === 1` "is this
income?" check (e.g. [gift.ts](../../../src/lib/gift.ts) `isGiftTransferable`,
CSV export, staff ledger, daily income) — refund rows must not be mistaken for
payments. Daily cash ([daily-income.ts](../../../src/lib/daily-income.ts)) is
unaffected: a Stripe refund isn't cash.

### Eligibility — pure function, unit-tested

`getCancellationEligibility(shooting, now)` in `src/lib/` →
`{ canCancel: false, reason: '<Hungarian>' } | { canCancel: true, payment: { ledgerEntryId, paymentIntent, amountInCents } }`.

Cancellable iff all hold:
- `cancelledAt == null` and `completedAt == null`;
- the time slot's `startTime` is in the future;
- exactly **one** income-side ledger row exists, its category is
  `INCOME_CLIENT_PAYMENT_DEPOSIT` or `INCOME_CLIENT_PAYMENT_FULL`, and no other
  income row (balance, extra, other) exists;
- no `FINAL` invoice exists.

Refund additionally requires the payment row's `method === CARD` and a
non-empty `paymentIntent`. *(My call: if those are missing the checkbox is
disabled with an explanation, cancellation without refund still works.)*

Used by the page (show/disable the button, explain why) and re-checked inside
the action.

### Server action `cancelPhotoShooting` (`src/server/cancel-photo-shooting.ts`)

Input: `shootingId`, `refund: boolean`, `reason?: string` (trimmed, empty →
null, length-capped). Returns `{ error }` / `{ ok }` per project convention.

1. `verifySession()` + **SUPERADMIN only** (decided): the action refuses any
   other role; the page renders the collapsible only for SUPERADMIN.
2. Load shooting, run eligibility; refuse with its Hungarian reason.
3. If `refund`: `stripe.refunds.create({ payment_intent }, { idempotencyKey:
   'cancel-refund:<ledgerEntryId>' })`. Stripe returns the **same** refund on a
   repeat, so a retry after a failed step 4 is safe. Refund `status`
   `succeeded` or `pending` both count as done (log + Discord note when
   `pending`); `failed`/`canceled` → return error, nothing written.
4. One Prisma transaction:
   - `photoShooting.updateMany({ where: { id, cancelledAt: null }, data: {
     cancelledAt: now, cancellationReason, status: CANCELLED } })`; count 0 →
     abort (someone else cancelled). *(Status set directly, matching what the
     derivation returns.)*
   - if refunded: create the `REFUND_CLIENT_PAYMENT` row (amount = payment
     amount, method CARD, `stripeRefundId`, description incl. reason).
5. After commit, publish QStash jobs: `reverse-invoice` (only if refunded),
   `calendar-event-delete`. Discord ping summarising the cancellation.
6. `revalidatePath` the shooting page.

Failure between 3 and 4 (DB down): action returns an error; staff clicks again;
Stripe's idempotency returns the existing refund and step 4 runs. The error copy
says exactly that ("A visszatérítés elindult, de a mentés nem sikerült —
próbáld újra").

### Job `src/app/api/jobs/reverse-invoice`

Body `{ shootingId, refundLedgerEntryId }`.
- Load the refund row; it must exist and have no `invoiceId` yet (else 200,
  already done).
- Find the original payment's invoice (the invoice attached to the shooting's
  DEPOSIT/FULL ledger row — `ADVANCE` or `NORMAL`). **Not there yet** (the
  original invoice job hasn't finished): `throw` so QStash retries.
- Claim/confirm/release in Redis like `claimDepositInvoice`
  (`storno_inv:<originalInvoiceId>`, claim **throws** on Redis outage).
- `invoiceService.reverseInvoice(originalNumber)` → new
  `InvoiceClient.reverseInvoice` wrapping the fork's `reverseInvoice` with
  `eInvoice: true`, `issueDate`/`completionDate` = now.
- Transaction: create `Invoice { type: STORNO, stornoOfId: original.id,
  amountInCents: -original.amountInCents, status: SETTLED }`, attach it to the
  refund ledger row (`invoiceId`), set original `status: REFUNDED`.
  *(My call on the negative amount and statuses; existing label "Visszatérítve"
  already exists for `REFUNDED`.)*
- The storno PDF is not emailed by szamlazz.hu (the fork has no `sendEmail` for
  storno). Its `publicUrl` is stored and visible on the admin page.

### Job `src/app/api/jobs/calendar-event-delete`

Body `{ shootingId }`. Load `BookingCalendarEvent`; none → 200. Call
`deleteCalendarEvent`; 404/410 → treat as deleted. Update the row
`status: 'deleted'`.

### Read-only

- Page: `isReadOnly = isCompleted || isCancelled` replaces the `isCompleted`
  gates; `readOnlyDetails` also true when cancelled. Balance payment, SumUp,
  image selection, price adjustment, time change controls hidden/disabled.
- Server side: a shared guard (e.g. `assertShootingEditable(shootingId)` or a
  `cancelledAt: null` condition in the update) in every mutation on a shooting:
  `updatePhotoShooting`, `updatePhotoShootingField`,
  `recalculatePhotoShootingStatus`, `changeTimeOfPhotoShooting`,
  `sendRawImagesForSelection`, `completePhotoShooting`, price adjustments
  (create/delete/attach*), `recordCashBalancePayment`, `createPaymentAttempt`,
  image selection (`previewImageSelection`, `confirmImageSelection`,
  `completeImageSelection`). *(My call: comments stay allowed — they are
  internal notes, useful precisely on a cancelled shooting.)*
- Gift: already handled — `CANCELLED` is not in `GIFT_TRANSFERABLE_STATUSES`,
  which both `getGiftShootingByCode` and `redeemGift`'s compare-and-swap use,
  and [gift.test.ts](../../../src/lib/gift.test.ts) pins it. No work.
- Client portal: shows the shooting as cancelled; no actions.

### UI

```
▸ Fotózás lemondása                          (closed by default)
  ┌──────────────────────────────────────────────┐
  │ [ Lemondás ]  (destructive)                  │
  │  — or, if not eligible: disabled + reason    │
  └──────────────────────────────────────────────┘

AlertDialog
  Fotózás lemondása
  A fotózás lemondott státuszba kerül, az idősáv nem lesz újra
  foglalható, a naptáresemény törlődik. Ez nem visszavonható.
  [x] Visszatérítés: 12 000 Ft visszamegy a kártyára (+ sztornó számla)
  Lemondás indoka (opcionális)
  [ textarea                                      ]
            [ Mégse ]  [ Lemondás ] (destructive, pending state)
```

Once cancelled, the collapsible shows instead: cancelled at (Budapest time),
reason, refund yes/no with amount and the storno invoice link once it exists.

### Tests (pure functions only, per project convention)

- `getCancellationEligibility`: deposit only ✓, gift full ✓, balance present ✗,
  extra present ✗, final invoice ✗, past start ✗, already cancelled ✗, no
  paymentIntent → cancel ✓ / refund ✗.
- Stats aggregation with a refund row: income nets out, expenses unchanged.
- Any other function whose income detection changes in the audit.

Everything touching Stripe, szamlazz.hu, Calendar, QStash stays manual QA
(Stripe test mode refund, szamlazz test account storno).

## Left to the builder

- Exact file split, component names, Hungarian copy wording.
- Whether the read-only guard is a helper or a `where` condition, per action.
- Reason length cap (suggest 1000).
- Updating [upcoming-work.md](../../../src/docs/upcoming-work.md) (priority 5
  done, "Cancellation is still a dead end" section) and CLAUDE.md where the
  ledger/side rule belongs.

## Open items

- Client cancellation email — later; for gifts decide buyer vs recipient then.
- `refund.failed` webhook → Discord — later, if a pending refund ever matters.
