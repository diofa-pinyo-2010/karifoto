# Photo Shooting Cancellation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SUPERADMIN can cancel a not-yet-shot booking from the admin shooting page, optionally refunding the single Stripe payment in full, with the storno invoice, ledger, calendar and status kept consistent.

**Architecture:** A server action does the eligibility check, the idempotent Stripe refund and one DB transaction (stamp cancellation + refund ledger row), then fans out QStash jobs for the storno invoice and the calendar delete — the same shape as the Stripe webhook. "Is this income?" moves from the ledger sign / name prefix to an explicit side map, so a refund nets income instead of counting as an expense.

**Tech Stack:** Next.js 16 server actions, Prisma 7 / Postgres, Stripe Node, `@halftome/szamlazz-client` fork, Upstash QStash + Redis, Google Calendar, shadcn (Base UI) AlertDialog/Checkbox/Textarea, Vitest (pure functions only).

**Spec:** [docs/superpowers/specs/2026-11-17-photo-shooting-cancellation-design.md](../specs/2026-11-17-photo-shooting-cancellation-design.md)

## Global Constraints

- Branch `feature/photo-shooting-cancellation`; never commit/push to `main`. Check `git branch --show-current` before each commit.
- No relative imports — `@/` only. Prisma types from `@/generated/prisma/client` / `@/generated/prisma/enums`.
- Env only via `@/env`.
- Money in integer fillér; ledger rows stored signed: `amountInCents = amount * LEDGER_ENTRY_CATEGORY_SIGN[category]`.
- User-facing copy Hungarian; match comment language of the edited file.
- Server actions return `{ error: '<Hungarian>' } | { success: true }`, never throw for expected failures.
- QStash jobs: `verifySignatureAppRouter`, zod-parse body, `489 + Upstash-NonRetryable-Error: true` for never-valid payloads, `throw` for retryable.
- Storno Redis claim **throws** on Redis outage (re-issuing a szamlazz document is worse than a delay); confirm/release swallow errors.
- Refund is always the full amount of the one payment row. No partial refunds.
- Time slot stays un-revealed after cancellation.
- Only SUPERADMIN may cancel (action + UI).
- After each task: `pnpm typecheck && pnpm lint && pnpm fmt && pnpm test:run` must pass. Manual E2E is the user's job.

## Review Focus

1. **Double click / two tabs** — second submit must not create a second refund row or storno: Stripe idempotency key + `updateMany where cancelledAt: null` + `stripeRefundId @unique`. Pinned in Task 2 Step 1 (`buildRefundIdempotencyKey` is stable per payment row) and manual QA.
2. **DB write fails after the Stripe refund succeeded** — retrying the action must reuse the same refund (same idempotency key), not refuse because "already refunded". Owned by Task 5.
3. **Original invoice not issued yet** when the storno job runs (cancel seconds after booking) — job must `throw` (retry), not 489. Pinned in Task 4 Step 1 (`planStorno` returns `retry`).
4. **Refund row mistaken for a payment** — `calculatePricing.totalPaid`, stats income and the expense list must all treat it as negative income. Pinned in Task 1 tests.
5. **Non-card / missing paymentIntent payment** (e.g. legacy or manual rows) — cancellation allowed, refund checkbox disabled. Pinned in Task 2 tests.

---

### Task 1: Schema + ledger side map

**Files:**

- Modify: `prisma/schema.prisma` (PhotoShooting, LedgerEntry, `LedgerEntryCategory`)
- Create: `prisma/migrations/<timestamp>_photo_shooting_cancellation/migration.sql` (via `pnpm db:migrate --name photo_shooting_cancellation`)
- Modify: `src/lib/constants.ts` (SIGN, new SIDE, LABEL, `SETTLES_BALANCE`)
- Modify: `src/lib/admin-stats.ts:124-130`, `src/lib/queries.ts:787-789`, `src/server/pricing.ts:165-167`
- Test: `src/lib/admin-stats.test.ts`, `src/server/pricing.test.ts`

**Interfaces:**

- Produces: `PhotoShooting.cancellationReason: string | null`; `LedgerEntry.stripeRefundId: string | null` (`@unique`); `LedgerEntryCategory.REFUND_CLIENT_PAYMENT`; `export const LEDGER_ENTRY_CATEGORY_SIDE: Record<LedgerEntryCategory, 'INCOME' | 'EXPENSE'>` in `@/lib/constants`.
- Values: SIGN `REFUND_CLIENT_PAYMENT: -1`, SIDE `'INCOME'` (all `INCOME_*` → `'INCOME'`, all `EXPENSE_*` → `'EXPENSE'`), LABEL `'Visszatérítés'`, `SETTLES_BALANCE: false`.

- [ ] **Step 1: Schema + migration.** Add the field, column and enum member; run `pnpm db:migrate --name photo_shooting_cancellation`. Expected: migration created and applied, `pnpm db:generate` OK.
- [ ] **Step 2: Write failing tests.**
  - `admin-stats.test.ts`: `it('nets a refund against income, not expenses')` — ledgerSums `[{DEPOSIT, 10_000_00}, {REFUND_CLIENT_PAYMENT, -10_000_00}, {EXPENSE_RENT, -5_000_00}]` → `income === 0`, `expenses === 5_000_00`.
  - `pricing.test.ts`: `it('subtracts a refund from totalPaid')` — ledgerEntries deposit `10_000_00` + refund `-10_000_00` → `totalPaid === 0`. (Keep that file's rule about not importing `constants.ts` — check its header comment and follow it.)
- [ ] **Step 3: Run** `pnpm test:run src/lib/admin-stats.test.ts src/server/pricing.test.ts` → FAIL (refund counted as expense / not in totalPaid).
- [ ] **Step 4: Implement.** Add the SIDE map and the other `Record` entries the compiler demands; switch the three income checks (`buildAdminStats`, `INCOME_CATEGORIES`, `totalPaid`) to `LEDGER_ENTRY_CATEGORY_SIDE[c] === 'INCOME'`. Bump `ADMIN_STATS_CACHE_VERSION` to `'v4'`. Leave `isGiftTransferable`'s sign check as is (it asks "is this a payment that needs an invoice", and refund rows only exist on cancelled shootings, which are never transferable).
- [ ] **Step 5: Run** full `pnpm typecheck && pnpm lint && pnpm test:run` → PASS.
- [ ] **Step 6: Commit** `feat: refund ledger category on the income side`.

### Task 2: Cancellation eligibility (pure)

**Files:**

- Create: `src/lib/cancellation.ts`, `src/lib/cancellation.test.ts`

**Interfaces:**

- Consumes: `LEDGER_ENTRY_CATEGORY_SIDE` (Task 1).
- Produces:
  ```ts
  type CancellationInput = {
    cancelledAt: Date | null;
    completedAt: Date | null;
    startTime: Date;
    ledgerEntries: {
      id: string;
      category: LedgerEntryCategory;
      amountInCents: number;
      method: PaymentMethod;
      paymentIntent: string | null;
      invoice: { type: InvoiceType } | null;
    }[];
  };
  type CancellationEligibility =
    | { canCancel: false; reason: string }
    | {
        canCancel: true;
        payment: {
          ledgerEntryId: string;
          amountInCents: number;
          paymentIntent: string | null;
          method: PaymentMethod;
        };
        canRefund: boolean;
      };
  export function getCancellationEligibility(
    input: CancellationInput,
    now: Date,
  ): CancellationEligibility;
  export function buildRefundIdempotencyKey(ledgerEntryId: string): string; // `cancel-refund:${ledgerEntryId}`
  ```
- Rules (from spec): not cancelled, not completed, `startTime > now`, exactly one INCOME-side row, its category `INCOME_CLIENT_PAYMENT_DEPOSIT` or `INCOME_CLIENT_PAYMENT_FULL`, no row whose `invoice.type === 'FINAL'`. `canRefund = method === 'CARD' && paymentIntent` non-empty. Reasons are Hungarian, e.g. `'A fotózás már le van mondva.'`, `'A fotózás időpontja már elmúlt.'`, `'Csak akkor mondható le, ha kizárólag az előleg / teljes összeg van befizetve.'`. Expense rows (staff fees) do not block.

- [ ] **Step 1: Write failing tests** (`describe('getCancellationEligibility')`): deposit only → `canCancel: true, canRefund: true, payment.amountInCents === 10_000_00`; gift FULL only → true; DEPOSIT + BALANCE → false; DEPOSIT + EXTRA → false; FINAL invoice present → false; `startTime <= now` → false; `cancelledAt` set → false; `completedAt` set → false; no income row → false; CASH deposit → `canCancel: true, canRefund: false`; CARD with `paymentIntent: null` → `canRefund: false`; an `EXPENSE_PHOTOGRAPHER_FEE` row alongside deposit → still true. Plus `buildRefundIdempotencyKey('abc') === 'cancel-refund:abc'`.
- [ ] **Step 2: Run** `pnpm test:run src/lib/cancellation.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement** in `src/lib/cancellation.ts`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: cancellation eligibility rules`.

### Task 3: Storno invoice client + Redis claim

**Files:**

- Modify: `src/lib/invoice/types.ts`, `src/lib/invoice/szamlazz-client.ts`, `src/lib/invoice/invoice-service.ts`, `src/lib/idempotency.ts`
- Test: `src/lib/invoice/invoice-service.test.ts`

**Interfaces:**

- Produces: `InvoiceClient.reverseInvoice(invoiceNumber: string): Promise<GeneratedInvoice>` and `InvoiceService.reverseInvoice(invoiceNumber: string)`; szamlazz impl calls the fork's `client.reverseInvoice(number, { eInvoice: true, issueDate: now, completionDate: now })` and maps `result.invoice.number` / `customerAccountUrl` like `issue()`.
- Produces in `@/lib/idempotency`: `claimStornoInvoice(originalInvoiceId): Promise<boolean>` (throws on Redis error), `confirmStornoInvoice(originalInvoiceId, invoiceNumber): Promise<void>`, `releaseStornoInvoiceClaim(originalInvoiceId): Promise<void>`; key `storno_inv:${originalInvoiceId}`, same TTLs and stances as the deposit trio.

- [ ] **Step 1: Failing test** — extend `fakeClient()` with `reverseInvoice` recording `{ method: 'reverseInvoice', invoiceNumber }`; `it('reverses by invoice number')` asserts the call and returned number.
- [ ] **Step 2: Run** `pnpm test:run src/lib/invoice/invoice-service.test.ts` → FAIL.
- [ ] **Step 3: Implement** types, szamlazz client, service, Redis trio (doc comment in Hungarian, mirroring the deposit one).
- [ ] **Step 4: Run** → PASS; `pnpm typecheck`.
- [ ] **Step 5: Commit** `feat: storno invoice support`.

### Task 4: QStash jobs — reverse-invoice, calendar-event-delete

**Files:**

- Create: `src/app/api/jobs/reverse-invoice/route.ts`, `src/app/api/jobs/calendar-event-delete/route.ts`
- Create: `src/lib/storno.ts`, `src/lib/storno.test.ts`

**Interfaces:**

- Consumes: Task 3 service + Redis trio; `deleteCalendarEvent(eventId)` from `@/lib/google-calendar`.
- Produces: job bodies `{ shootingId: uuid, refundLedgerEntryId: uuid }` and `{ shootingId: uuid }`.
- Produces pure helper:

  ```ts
  export function planStorno(input: {
    refundEntry: { invoiceId: string | null } | null;
    originalInvoice: { id: string; invoiceNumber: string; amountInCents: number } | null;
  }): { action: 'skip' } | { action: 'retry' } | { action: 'fail' } | { action: 'issue'; originalInvoice: {...} };
  ```

  `refundEntry == null` → `fail` (489); `refundEntry.invoiceId != null` → `skip` (200); `originalInvoice == null` → `retry` (throw); else `issue`.

- [ ] **Step 1: Failing tests** for `planStorno` — the four branches above.
- [ ] **Step 2: Run** `pnpm test:run src/lib/storno.test.ts` → FAIL.
- [ ] **Step 3: Implement `planStorno`**, run → PASS.
- [ ] **Step 4: Implement reverse-invoice route.** Load refund row and the original invoice (the invoice on the shooting's DEPOSIT/FULL ledger row). On `issue`: claim (false → 200 "already claimed"), `invoiceService.reverseInvoice`, then confirm; on szamlazz error release claim and throw. Persist in one transaction: `Invoice { type: STORNO, stornoOfId, invoiceNumber, publicUrl, amountInCents: -original.amountInCents, status: SETTLED, photoShootingId }`, set refund row `invoiceId`, original invoice `status: REFUNDED`. Follow `generate-deposit-invoice/route.ts` structure.
- [ ] **Step 5: Implement calendar-event-delete route.** No `BookingCalendarEvent` → 200. `deleteCalendarEvent`; error with status 404/410 → treat as deleted (pattern in `calendar-event-sync/route.ts:76-90`); other errors throw. Update row `status: 'deleted', lastSyncedAt: now`.
- [ ] **Step 6: Verify** `pnpm typecheck && pnpm lint`.
- [ ] **Step 7: Commit** `feat: storno and calendar delete jobs`.

### Task 5: `cancelPhotoShooting` server action

**Files:**

- Create: `src/server/cancel-photo-shooting.ts`

**Interfaces:**

- Consumes: Task 2 (`getCancellationEligibility`, `buildRefundIdempotencyKey`), Task 4 job URLs, `stripe` from `@/lib/stripe`, `qStashClient` from `@/lib/upstash`, `sendDiscordNotification`, `verifySession`.
- Produces:

  ```ts
  export async function cancelPhotoShooting(input: {
    shootingId: string;
    refund: boolean;
    reason: string;
  }): Promise<{ error: string } | { success: true }>;
  ```

- [ ] **Step 1: Implement**, in order:
  1. `const { staffProfile } = await verifySession()`; `staffProfile.role !== SUPERADMIN` → `{ error: 'Csak admin mondhat le fotózást.' }`.
  2. zod: `shootingId` uuid, `refund` boolean, `reason` trimmed, max 1000, `''` → null.
  3. Load shooting (cancelledAt, completedAt, timeSlot.startTime, ledgerEntries with invoice type), run eligibility → `{ error: reason }` if not.
  4. `refund && !canRefund` → `{ error: 'Ennél a fizetésnél nem lehet automatikusan visszatéríteni.' }`.
  5. If refund: `stripe.refunds.create({ payment_intent }, { idempotencyKey: buildRefundIdempotencyKey(payment.ledgerEntryId) })`. Status `failed`/`canceled` → error, nothing written. Stripe exception → `{ error: 'A visszatérítés nem sikerült, nem történt változás.' }`.
  6. `prisma.$transaction`: `photoShooting.updateMany({ where: { id, cancelledAt: null }, data: { cancelledAt: now, cancellationReason, status: CANCELLED } })`; count 0 → throw a sentinel → `{ error: 'A fotózást közben már lemondták.' }`. If refunded: `ledgerEntry.create({ category: REFUND_CLIENT_PAYMENT, amountInCents: payment.amountInCents * SIGN (negative), method: CARD, stripeRefundId: refund.id, photoShootingId, description: reason ?? null })`. Any DB error after a successful refund → `{ error: 'A visszatérítés elindult, de a mentés nem sikerült — próbáld újra.' }` (retry hits the same Stripe refund via the key).
  7. After commit: publish `reverse-invoice` (only if refunded, `retries: 5`) and `calendar-event-delete`; publish failures are logged + Discord `error`, not returned as failure (the cancellation stands).
  8. Discord `info` (or `warning` when `refund.status === 'pending'`): client name, amount, refund yes/no, reason.
  9. `revalidatePath(APP_URLS.photoShootingAdminPage(shootingId))`, `revalidateTag(ADMIN_STATS_TAG, { expire: 0 })`.
- [ ] **Step 2: Verify** `pnpm typecheck && pnpm lint && pnpm test:run` (eligibility + key tests from Task 2 cover the pure parts).
- [ ] **Step 3: Commit** `feat: cancelPhotoShooting action`.

### Task 6: Read-only guards on shooting mutations

**Files:**

- Modify: `src/server/admin.ts`, `src/server/photo-shootings.ts`, `src/server/price-adjustments.ts`, `src/server/balance-payment.ts`, `src/server/payment.ts`, `src/server/image-selection.ts`

**Interfaces:**

- Produces: `assertShootingEditable(shootingId: string): Promise<{ error: string } | null>` in `src/server/photo-shooting-guard.ts` returning `{ error: 'Lemondott fotózás nem módosítható.' }` when `cancelledAt != null`.

- [ ] **Step 1: Audit** each action listed in the spec's Read-only section. Where the action already requires a status a cancelled shooting can never have (e.g. `completePhotoShooting` requires `READY_TO_COMPLETE`), note it and skip. Otherwise call the guard right after `verifySession()` / input parsing. Comments stay allowed.
- [ ] **Step 2: Page.** In `src/app/admin/(protected)/photo-shootings/[id]/page.tsx` add `const isCancelled = status === CANCELLED` and use `isCompleted || isCancelled` wherever `isCompleted` disables a control (`readOnlyDetails` already includes CANCELLED); hide balance-payment / SumUp / send-raw / complete blocks when cancelled.
- [ ] **Step 3: Verify** `pnpm typecheck && pnpm lint`.
- [ ] **Step 4: Commit** `feat: cancelled shootings are read-only`.

### Task 7: UI — "Fotózás lemondása" collapsible + dialog

**Files:**

- Create: `src/components/CancelPhotoShootingSection.tsx` (client)
- Modify: `src/app/admin/(protected)/photo-shootings/[id]/page.tsx` (after "Elküldött email-ek"; extend the shooting query in `src/lib/queries.ts` `getPhotoShooting` only if `cancellationReason`/`stripeRefundId`/`paymentIntent` aren't already selected)

**Interfaces:**

- Consumes: `getCancellationEligibility` (computed on the server in the page, passed as a prop), `cancelPhotoShooting`.
- Props:

  ```ts
  { shootingId: string;
    eligibility: CancellationEligibility;
    cancelled: { at: Date; reason: string | null; refund: { amountInCents: number; stornoUrl: string | null } | null } | null }
  ```

- [ ] **Step 1: Implement** (`alert-dialog`, `checkbox`, `textarea`, `label` already exist in `src/components/ui/`). Rendered only when `session.staffProfile.role === SUPERADMIN`, inside `ItemsCollapsible title="Fotózás lemondása"`. States:
  - not cancelled, eligible: destructive **Lemondás** button → AlertDialog with the spec's copy, checkbox `Visszatérítés: <formatMoney(amount)> visszamegy a kártyára (+ sztornó számla)` (default unchecked; disabled with a one-line why when `!canRefund`), optional textarea "Lemondás indoka", Mégse / destructive Lemondás with pending state (`useTransition`), error shown inline, toast/close on success.
  - not cancelled, ineligible: disabled button + `eligibility.reason`.
  - cancelled: `Lemondva: <Budapest formatter>`, reason, refund amount + "Sztornó számla" link when present (else "Sztornó számla készül…").
    Use formatters from `@/lib/formatters` only.
- [ ] **Step 2: Verify** `pnpm typecheck && pnpm lint && pnpm fmt`.
- [ ] **Step 3: Commit** `feat: cancel photo shooting UI`.

### Task 8: Docs

**Files:**

- Modify: `src/docs/upcoming-work.md` (priority table row 5 ✅, rewrite "Cancellation is still a dead end"), `CLAUDE.md` (Money section: one line on `LEDGER_ENTRY_CATEGORY_SIDE` — "income vs expense is the side map, never the sign or name prefix").

- [ ] **Step 1: Edit both.**
- [ ] **Step 2: Verify** `pnpm fmt:check && pnpm typecheck && pnpm lint && pnpm test:run` → all green.
- [ ] **Step 3: Commit** `docs: cancellation shipped`.

Manual QA (user): Stripe test-mode refund (succeeded), double-click, cancel without refund, gift shooting cancel, storno appears on szamlazz test account, calendar event gone, stats income net, controls disabled.
