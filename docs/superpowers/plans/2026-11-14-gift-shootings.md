# Gift Shootings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A buyer can pay the full price of a shooting as a gift at booking, receive a `/ajandek/<code>` link, and the recipient who redeems it becomes the shooting's client (emails, portal, extras invoiced to them) while the buyer stays recorded as `purchasedById`.

**Architecture:** A new checkout kind `booking_gift` reuses the deposit webhook path with a different ledger category (`INCOME_CLIENT_PAYMENT_FULL`), a `giftCode`, and a new `generate-full-amount-invoice` job. Redemption is a public page + Server Action that moves `PhotoShooting.clientId` to the recipient. Every decision that can be pure (code format, eligibility, booking total) is a pure function with Vitest tests; everything touching Stripe/Postgres is manual QA (repo convention).

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 7 (PostgreSQL), Stripe Checkout, Upstash QStash/Redis, React Email + Resend, szamlazz.hu, Vitest.

**Spec:** [docs/superpowers/specs/2026-11-14-gift-shootings-design.md](../specs/2026-11-14-gift-shootings-design.md)

## Global Constraints

- One PR, branch `gift-shootings`. Never commit or push to `main`.
- No relative imports — `@/` only. Prisma types from `@/generated/prisma/client` / `@/generated/prisma/enums`.
- Env only via `src/env.ts`.
- Money is integer cents; render with `formatMoney()`.
- User-facing copy Hungarian; match the comment language of the file you edit.
- Server Actions return `{ error: '<Hungarian>' }`, never throw for user errors; staff actions start with `await verifySession()`.
- QStash jobs: zod-parse body, 489 + `Upstash-NonRetryable-Error` for never-valid, `throw` for retryable.
- Invoice claim helpers **throw** on Redis failure; confirm/release swallow errors.
- Never regenerate a migration containing hand-written SQL.
- Gift code: 8 chars, Crockford base32 (`0123456789ABCDEFGHJKMNPQRSTVWXYZ`), stored uppercase without separator, displayed `XXXX-XXXX`.
- Full-amount invoice: one NORMAL invoice, issue date and completion date = purchase date (existing behaviour; `GenerateInvoiceInput` unchanged). No előlegszámla, no végszámla for a gift purchase.
- No QR codes anywhere. No regenerate/create gift link in admin.
- Verification per task: `pnpm test:run` (when tests exist), `pnpm typecheck`, `pnpm lint`, `pnpm fmt`. E2E is manual QA by the user.

## Review Focus

1. **Gift code typed by hand** (lowercase, with dash or spaces, `0`/`O` confusion) → the same shooting is found; garbage never hits the DB. Pinned in Task 2.
2. **Gift purchase with an early-bird discount / extra guests / pets** → the Stripe amount equals the total the page displayed and the total `calculatePricing` reports for the created shooting. Pinned in Task 3.
3. **Redeeming with an email that already belongs to a user** → no session issued and that user's name/phone are **not** overwritten. Decision pinned in Task 9 (`planGiftRedemption`), rest manual QA.
4. **Two submits of the same gift link (double click, two tabs)** → exactly one transfer; the second gets the "nem átruházható" message. Guarded by `updateMany where giftCode` count check in Task 9; manual QA.
5. **Gift link opened after redemption, for an unpaid/un-invoiced shooting, or after image selection started** → same "nem átruházható" message, no detail leak. Pinned in Task 2 (`isGiftTransferable`).

---

### Task 1: Schema, ledger category, `SETTLES_BALANCE`

**Files:**
- Modify: `prisma/schema.prisma` (PhotoShooting, ClientProfile, BookingIntent, `LedgerEntryCategory`)
- Create: `prisma/migrations/<ts>_gift_shootings/migration.sql` (generated)
- Create: `prisma/migrations/<ts>_settling_payment_index/migration.sql` (hand-written)
- Modify: `src/lib/constants.ts` (`LEDGER_ENTRY_CATEGORY_SIGN`, `LEDGER_ENTRY_CATEGORY_LABEL`, new `SETTLES_BALANCE`)
- Modify: `src/lib/utils.ts:167` (`isBalanceCollected`)
- Test: `src/lib/utils.test.ts` (create if absent, else extend)

**Interfaces:**
- Produces: `PhotoShooting.purchasedById: string | null`, `PhotoShooting.purchasedBy` (relation `"PurchasedShootings"`), `PhotoShooting.giftCode: string | null @unique`, `ClientProfile.purchasedShootings`, `BookingIntent.isGift: boolean @default(false)`, `LedgerEntryCategory.INCOME_CLIENT_PAYMENT_FULL`, `SETTLES_BALANCE: Record<LedgerEntryCategory, boolean>` exported from `@/lib/constants`.

- [ ] **Step 1: Write the failing test**

```ts
describe('isBalanceCollected', () => {
  it('is true for a balance payment', () => {
    expect(isBalanceCollected([entry('INCOME_CLIENT_PAYMENT_BALANCE')])).toBe(true);
  });
  it('is true for a full (gift) payment', () => {
    expect(isBalanceCollected([entry('INCOME_CLIENT_PAYMENT_FULL')])).toBe(true);
  });
  it('is false for deposit + extra only', () => {
    expect(
      isBalanceCollected([entry('INCOME_CLIENT_PAYMENT_DEPOSIT'), entry('INCOME_CLIENT_PAYMENT_EXTRA')]),
    ).toBe(false);
  });
});
```
(`entry(category)` = a minimal `LedgerEntry` fixture cast; only `category` is read.)

- [ ] **Step 2: Schema edit**

Add the fields listed in Interfaces (`purchasedById String? @db.Uuid`, `@@index([purchasedById])`, `giftCode String? @unique`) and the enum value `INCOME_CLIENT_PAYMENT_FULL` after `INCOME_CLIENT_PAYMENT_BALANCE`.

- [ ] **Step 3: Generate migration 1**

Run: `pnpm db:migrate --name gift_shootings`
Expected: migration created and applied; `pnpm db:generate` output in `src/generated/prisma`.

- [ ] **Step 4: Hand-write migration 2** (separate migration because Postgres refuses to use an enum value added in the same transaction)

Run: `pnpm db:migrate:co --name settling_payment_index`, then put in the SQL (Hungarian header comment in the style of `20261001010131_one_balance_payment_per_shooting`, "Kézzel írt migráció. NE generáld újra." first line, explaining both categories settle the balance — see `src/docs/upcoming-work.md` §8):

```sql
DROP INDEX "LedgerEntry_one_balance_per_photo_shooting_key";
CREATE UNIQUE INDEX "LedgerEntry_one_balance_per_photo_shooting_key"
  ON "LedgerEntry" ("photoShootingId")
  WHERE "category" IN ('INCOME_CLIENT_PAYMENT_BALANCE', 'INCOME_CLIENT_PAYMENT_FULL');
```
Then `pnpm db:migrate`. Expected: applied, no drift reported.

- [ ] **Step 5: Constants + predicate**

`LEDGER_ENTRY_CATEGORY_SIGN.INCOME_CLIENT_PAYMENT_FULL = 1`; label `'Teljes összeg (ajándék)'`; `SETTLES_BALANCE` exhaustive record next to the sign record (`BALANCE` and `FULL` true, all else false); `isBalanceCollected` becomes `ledgerEntries.some((e) => SETTLES_BALANCE[e.category])`.

- [ ] **Step 6: Verify**

Run: `pnpm test:run src/lib/utils.test.ts && pnpm typecheck && pnpm lint`
Expected: PASS. Typecheck will flag any other exhaustive `LedgerEntryCategory` record — add the FULL entry there.

- [ ] **Step 7: Commit** — `feat: gift shooting schema and FULL ledger category`

---

### Task 2: Gift code + transfer eligibility (pure)

**Files:**
- Modify: `src/lib/token.ts` (`generateGiftCode` only)
- Create: `src/lib/gift.ts` (everything else)
- Test: `src/lib/token.test.ts` (extend or create), `src/lib/gift.test.ts`

**Interfaces:**
- Produces (`@/lib/token`, server-only because of `node:crypto`): `generateGiftCode(): string` (8 chars, uppercase, alphabet above).
- Produces (`@/lib/gift`, pure, no `node:crypto`/`env` imports — safe for client components and Vitest): `GIFT_CODE_ALPHABET`, `formatGiftCode(code: string): string` (`'KF7MQ2XR'` → `'KF7M-Q2XR'`), `normalizeGiftCode(input: unknown): string | null`, `giftRedeemPath(code: string): string` (→ `/ajandek/KF7M-Q2XR`), `GIFT_TRANSFERABLE_STATUSES: readonly PhotoShootingStatus[]` = `[PHOTOGRAPHER_SELECTION, WAITING_FOR_THE_DATE, WAITING_FOR_BALANCE_PAYMENT, RAW_PHOTOS_UPLOAD]`; `isGiftTransferable(input: { status: PhotoShootingStatus; totalToBePaidInCents: number; ledgerEntries: Pick<LedgerEntry, 'category' | 'invoiceId'>[] }): boolean`.

- [ ] **Step 1: Write the failing tests**

```ts
// token.test.ts
it('generates 8 chars from the Crockford alphabet', () => {
  for (let i = 0; i < 200; i++) expect(generateGiftCode()).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
});

// gift.test.ts
it('formats as XXXX-XXXX', () => expect(formatGiftCode('KF7MQ2XR')).toBe('KF7M-Q2XR'));
it('builds the redeem path', () => expect(giftRedeemPath('KF7MQ2XR')).toBe('/ajandek/KF7M-Q2XR'));
it.each([
  ['KF7M-Q2XR', 'KF7MQ2XR'],
  ['kf7m-q2xr', 'KF7MQ2XR'],
  [' KF7M Q2XR ', 'KF7MQ2XR'],
])('normalizes %s', (input, out) => expect(normalizeGiftCode(input)).toBe(out));
it.each(['KF7M-Q2X', 'KF7MQ2XRR', 'KF7I-Q2XR', 'KFOM-Q2XR', 'KF7L-Q2XU', 42, null])(
  'rejects %s', (input) => expect(normalizeGiftCode(input)).toBeNull(),
);

// gift.test.ts — invoiced income rows, zero balance, pre-selection status → true
it('allows a fully paid, fully invoiced shooting before selection', ...);           // FULL row with invoiceId, 0, WAITING_FOR_THE_DATE → true
it('refuses while money is still owed', ...);                                        // totalToBePaidInCents: 1 → false
it('refuses while an income row has no invoice yet', ...);                           // FULL row invoiceId null → false
it('ignores expense rows without an invoice', ...);                                  // + EXPENSE_PHOTOGRAPHER_FEE invoiceId null → true
it.each(['USER_SELECTION', 'EDITOR_SELECTION', 'COMPLETED', 'CANCELLED'])('refuses in %s', ...);
it.each(GIFT_TRANSFERABLE_STATUSES)('allows %s', ...);
```

- [ ] **Step 2: Run, expect FAIL** — `pnpm test:run src/lib/token.test.ts src/lib/gift.test.ts`

- [ ] **Step 3: Implement**

`generateGiftCode` (token.ts, imports `GIFT_CODE_ALPHABET` from `@/lib/gift`): `randomBytes(8)`, each byte `% 32` indexes the alphabet (unbiased: 256 % 32 = 0). `normalizeGiftCode`: string check → `stripLoginCodeSeparators` → trim → uppercase → `/^[0-9A-HJKMNP-TV-Z]{8}$/` or null. `isGiftTransferable`: status in list **and** `totalToBePaidInCents <= 0` **and** every entry with `LEDGER_ENTRY_CATEGORY_SIGN[category] === 1` has `invoiceId != null`.

- [ ] **Step 4: Run, expect PASS**; `pnpm typecheck && pnpm lint`

- [ ] **Step 5: Commit** — `feat: gift code format and transfer eligibility`

---

### Task 3: Booking-intent total (pure) and summary page refactor

**Files:**
- Create: `src/lib/booking-intent-total.ts`
- Test: `src/lib/booking-intent-total.test.ts`
- Modify: `src/components/BookingReview.tsx:33-55` (replace inline total)

**Interfaces:**
- Produces: `calculateBookingIntentTotal(intent: { package: Package; isLightPlaySelected: boolean; numberOfGuests: number; numberOfPets: number; adjustments: Pick<PriceAdjustment, 'amountInCents' | 'type'>[] }): number` (cents).

- [ ] **Step 1: Write the failing test** — the guard is equality with what the webhook-created shooting will report:

```ts
it.each([
  ['base package', { numberOfGuests: 2, numberOfPets: 0, isLightPlaySelected: false, adjustments: [] }],
  ['light play + extra people + pets', { numberOfGuests: 6, numberOfPets: 2, isLightPlaySelected: true, adjustments: [] }],
  ['early-bird discount', { numberOfGuests: 2, numberOfPets: 0, isLightPlaySelected: false,
      adjustments: [{ type: 'DISCOUNT', amountInCents: 5000_00 }] }],
])('matches calculatePricing().totalToBePaid for %s', (_, intent) => {
  for (const pkg of Object.keys(PACKAGES) as Package[]) {
    const input = { ...intent, package: pkg };
    expect(calculateBookingIntentTotal(input)).toBe(
      calculatePricing({
        pricing: { ...buildPricingSnapshot(pkg) } as PhotoShootingPricing,
        shooting: shootingFrom(input),   // fixture: same fields as webhook's photoShooting.create, counters 0
        adjustments: input.adjustments as PriceAdjustment[],
        ledgerEntries: [],
      }).totalToBePaid,
    );
  }
});
```
`shootingFrom` mirrors the webhook's `photoShooting.create` data (incl. `isLightPlaySelected: isLightPlayChargeable(pkg) && intent.isLightPlaySelected`, `totalEditedImages: 0`, `totalRetouchedImages: 0`, `isExpressPostProduction: false`).

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement** using `buildPricingSnapshot(pkg)` for the rates (not `PACKAGES` directly) and `PRICE_ADJUSTMENT_TYPE_SIGN`. Replace `BookingReview`'s inline `total` computation with this function (keep the per-row display values as they are).

- [ ] **Step 4: Run, expect PASS**; typecheck, lint

- [ ] **Step 5: Commit** — `refactor: single booking-intent total shared by summary and checkout`

---

### Task 4: Gift checkout session + webhook `booking_gift` path

**Files:**
- Modify: `src/lib/checkout-metadata.ts`, `src/lib/checkout-metadata.test.ts`
- Modify: `src/server/stripe.ts` (`createCheckoutSession`)
- Modify: `src/app/api/webhooks/stripe/route.ts` (`routeCheckoutSession`, `handleBookingDeposit`)
- Modify: `src/lib/constants.ts` (`GIFT_LINE_ITEM_NAME = 'Fotózás'`)

**Interfaces:**
- Consumes: `calculateBookingIntentTotal` (Task 3), `generateGiftCode` (Task 2), `BookingIntent.isGift`, `INCOME_CLIENT_PAYMENT_FULL` (Task 1).
- Produces: checkout kind `{ kind: 'booking_gift'; booking_intent_id: string }`; `CHECKOUT_KIND_LEDGER_CATEGORY.booking_gift = INCOME_CLIENT_PAYMENT_FULL`; QStash publish to `/api/jobs/generate-full-amount-invoice` with body `{ shootingId, bookingIntentId, sessionId, paymentIntent, amountTotal }` (same shape as the deposit job).

- [ ] **Step 1: Failing tests** in `checkout-metadata.test.ts`: a `GIFT_METADATA` fixture with `satisfies CheckoutMetadata` parses ok; `CHECKOUT_KIND_LEDGER_CATEGORY.booking_gift` equals `LedgerEntryCategory.INCOME_CLIENT_PAYMENT_FULL`.

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Metadata** — add `bookingGiftMetadata` to the discriminated union and the ledger map. Typecheck now fails in the webhook switch; that is expected.

- [ ] **Step 4: `createCheckoutSession`** — add `isGift: z.enum(['true','false']).optional()` (absent = `'false'`) to `CheckoutSchema`; persist `isGift` in the existing `bookingIntent.update`; include `adjustments` in the intent query. If gift: one line item `GIFT_LINE_ITEM_NAME`, `unit_amount = calculateBookingIntentTotal({...intent, numberOfGuests, numberOfPets})` (the submitted counts), no description, metadata `{ kind: 'booking_gift', booking_intent_id }`. Else unchanged. All other session options identical.

- [ ] **Step 5: Webhook** — rename `handleBookingDeposit(session, bookingIntentId)` to `handleBooking(session, bookingIntentId, kind: 'booking_deposit' | 'booking_gift')`; the switch calls it for both. Differences when `kind === 'booking_gift'`:
  - ledger category from `CHECKOUT_KIND_LEDGER_CATEGORY[kind]` (works for both);
  - in the shooting-creation transaction set `giftCode: generateGiftCode()`; on `P2002` whose `meta.target` includes `giftCode`, retry the transaction up to 3 times, then throw (→ 500, Stripe retries);
  - publish `generate-full-amount-invoice` instead of `generate-deposit-invoice`;
  - if `session.amount_total !== calculatePricing(...).totalToBePaid` for the new shooting (load pricing/adjustments after conversion), still record the payment and send a Discord `warning` with both amounts.
  - Email job unchanged (Task 6 makes it gift-aware by reading `giftCode`).

- [ ] **Step 6: Verify** — `pnpm test:run src/lib/checkout-metadata.test.ts && pnpm typecheck && pnpm lint`

- [ ] **Step 7: Commit** — `feat: booking_gift checkout kind and webhook path`

---

### Task 5: `generate-full-amount-invoice` job

**Files:**
- Create: `src/app/api/jobs/generate-full-amount-invoice/route.ts`
- Modify: `src/lib/idempotency.ts`

**Interfaces:**
- Consumes: payload from Task 4.
- Produces: `claimFullAmountInvoice(shootingId)`, `confirmFullAmountInvoice(shootingId, invoiceNumber)`, `releaseFullAmountInvoiceClaim(shootingId)`, key `full_amount_inv:${shootingId}`, same stances as the deposit trio (claim throws; others swallow).

- [ ] **Step 1: Implement** by copying `generate-deposit-invoice/route.ts` structure with these differences: `invoiceService.generateInvoice` (NORMAL) instead of `generateAdvanceInvoice`; line items from `stripe.checkout.sessions.listLineItems` with `unitPriceGross: centsToHuf(item.amount_total / quantity)` (as the extra job does); DB `Invoice.type: 'NORMAL'`; log prefix `[job:full-amount-inv-gen]`; Discord copy "Teljes összegű számla …". Billing address via `bookingIntentId` (buyer), email via `photoShooting.client.owner.email` — the eligibility rule (Task 2) guarantees no handover before this runs.

- [ ] **Step 2: Verify** — `pnpm typecheck && pnpm lint`. Manual QA: gift checkout in Stripe test mode → one NORMAL invoice at szamlazz, attached to the FULL ledger row, no ADVANCE invoice.

- [ ] **Step 3: Commit** — `feat: full-amount invoice job for gift purchases`

---

### Task 6: Gift variant of the booking confirmation email

**Files:**
- Modify: `src/emails/BookingConfirmation.tsx`, `src/lib/resend/booking-confirmation.ts`, `src/app/api/jobs/email-confirmation/route.ts`, `src/lib/email-previews.tsx`

**Interfaces:**
- Consumes: `PhotoShooting.giftCode`, `giftRedeemPath` (Task 2).
- Produces: `BookingConfirmationEmailProps.giftUrl?: string`; `sendBookingConfirmationEmail({ ..., giftUrl?: string })`.

- [ ] **Step 1: Template** — when `giftUrl` is set: intro becomes "Köszönjük, hogy a Karifotot választottátok! A fotózás teljes díja megérkezett hozzánk, a foglalást rögzítettük." and a gift block after the date/calendar link: heading "🎁 Ajándék", text explaining they can hand the link over whenever they like, the recipient fills in their details and from then on receives everything; if they come themselves, nothing to do. Link shows `giftUrl` as visible text. Everything else unchanged. No QR.
- [ ] **Step 2: Job** — select `giftCode`; when non-null pass `giftUrl: new URL(giftRedeemPath(giftCode), env.NEXT_PUBLIC_SITE_URL).toString()`. Sender passes it in `props` (so it lands in `SentEmail.variables`). Same `EmailType`.
- [ ] **Step 3: Preview** — add `slug: 'client-booking-confirmation-gift'`, label `'Foglalás megerősítése (ajándék)'`, with `giftUrl: 'https://karifoto.hu/ajandek/KF7M-Q2XR'`.
- [ ] **Step 4: Verify** — `pnpm typecheck && pnpm lint`; user checks both previews in `pnpm email:dev` / `/admin/email-previews`.
- [ ] **Step 5: Commit** — `feat: gift section in booking confirmation email`

---

### Task 7: Gift checkbox on the summary page + remote booking toggle

**Files:**
- Modify: `src/components/BookingReview.tsx`, `src/lib/queries.ts` (`bookingIntentpublicSelect` + `isGift`)
- Modify: `src/server/booking-intent.ts` (`CreateBookingIntentInput.isGift: boolean`, persisted), `src/components/BookingFormNew.tsx` (pass `isGift: false`), `src/components/RemoteBookingForm.tsx` (Switch "Ajándék", default off)

**Interfaces:**
- Consumes: `calculateBookingIntentTotal`, form field `isGift` read by Task 4.

- [ ] **Step 1: Summary UI** — `const [isGift, setIsGift] = useState(bookingIntent.isGift)`; a checkbox block (icon 🎁, title "Ajándékba veszem", one-line description) under the deposit box, `brand-*` tokens per `src/docs/redesign-status.md`; hidden input `name="isGift" value={String(isGift)}`. When checked: deposit box text replaced by gift copy ("Ajándék esetén a fotózás teljes díját most kérjük; a fizetés után kapsz egy linket, amivel átadhatod az ajándékot."), sticky footer label "Teljes összeg" + `formatMoney(total)` instead of "Előleg" + deposit.
- [ ] **Step 2: Remote booking** — add `isGift` to the zod schema/default values of `RemoteBookingForm` and pass through `createRemoteBookingIntent` → `createBookingIntent`. Deposit-request email unchanged.
- [ ] **Step 3: Verify** — `pnpm typecheck && pnpm lint`. Manual QA: toggle → amounts swap; submit gift → Stripe shows one "Fotózás" line with the displayed total; cancel back → checkbox still checked; remote booking with Ajándék on → summary pre-checked.
- [ ] **Step 4: Commit** — `feat: gift option on booking summary and remote booking`

---

### Task 8: Gift-received / gift-redeemed emails

**Files:**
- Modify: `prisma/schema.prisma` (`EmailType`: `GIFT_RECEIVED`, `GIFT_REDEEMED`) + `pnpm db:migrate --name gift_email_types`
- Create: `src/emails/GiftReceived.tsx`, `src/emails/GiftRedeemed.tsx`, `src/lib/resend/gift.ts`
- Modify: `src/lib/resend/send-client-email.ts` (`CLIENT_EMAILS`), `src/lib/email-previews.tsx`

**Interfaces:**
- Produces: `sendGiftReceivedEmail({ to, name, buyerName, bookedTimeString, addToGoogleCalendarLink, clientPortalLoginLink, shootingId, clientId })` (to recipient — reworded booking confirmation: "<buyerName> megajándékozott egy fotózással", date, calendar link, arrival tips, portal button) and `sendGiftRedeemedEmail({ to, name, recipientName, bookedTimeString, shootingId, clientId })` (to buyer, short: "<recipientName> beváltotta az ajándékot"). Both via `sendClientEmail`, subject constants exported from the templates, `PreviewProps` set.

- [ ] **Step 1: Migration + templates + senders + registry entries + 2 preview entries.**
- [ ] **Step 2: Verify** — `pnpm typecheck && pnpm lint`; user checks previews.
- [ ] **Step 3: Commit** — `feat: gift received and redeemed emails`

---

### Task 9: `/ajandek/[giftCode]` page and redemption action

**Files:**
- Create: `src/app/ajandek/[giftCode]/page.tsx`, `src/components/GiftRedeemForm.tsx` (client), `src/server/gift.ts`
- Modify: `src/lib/gift.ts` (+ `planGiftRedemption`), `src/lib/gift.test.ts`, `src/lib/queries.ts` (`getGiftShootingByCode(code)`)

**Interfaces:**
- Consumes: `normalizeGiftCode`, `isGiftTransferable`, `calculatePricing`, `createSession`, `createClientPortalToken`, `clientPortalLoginUrl`, `sessionCookieOptions`, `CLIENT_SESSION_COOKIE_NAME`, Task 8 senders.
- Produces: `planGiftRedemption(input: { submittedEmail: string; currentClientEmail: string; existingUser: boolean }): { ok: false; error: string } | { ok: true; logIn: boolean }`; `redeemGift(giftCode: string, _prev: GiftRedeemState, formData: FormData): Promise<GiftRedeemState>` where `GiftRedeemState = { error?: string; checkInbox?: boolean } | undefined`.

- [ ] **Step 1: Failing tests** for `planGiftRedemption`:
  - same email as current client (case-insensitive, trimmed) → `{ ok: false, error: 'Ezt az ajándékot nem adhatod saját magadnak.' }`
  - new email → `{ ok: true, logIn: true }`
  - existing user → `{ ok: true, logIn: false }`
- [ ] **Step 2: Run FAIL → implement → PASS.**
- [ ] **Step 3: Query** — `getGiftShootingByCode(code)` selects id, status, clientId, purchasedById, package, `timeSlot.startTime`, `client.owner { email, name }`, `pricing`, `adjustments`, `ledgerEntries`, plus the scalars `calculatePricing` needs.
- [ ] **Step 4: Page** (public, `force-dynamic`, marketing styling) — normalize code → `notFound`-free single message "Ez az ajándék már nem váltható be." for: invalid code, unknown code, or `!isGiftTransferable`. Otherwise: "<buyer name> megajándékozott egy fotózással! 🎄", formatted date/time (`formatLongDate`), package label, and `GiftRedeemForm` (name, email, phone, marketing opt-out checkbox like the booking form, ÁSZF line).
- [ ] **Step 5: Action `redeemGift`** in this order:
  1. zod: name ≥ 2 chars trimmed, email, phone ≥ 6 chars trimmed, optOut boolean.
  2. Reload shooting by normalized code; not transferable → `{ error: 'Ez az ajándék már nem váltható be.' }`.
  3. `existingUser = await prisma.user.findUnique({ where: { email } })`; `planGiftRedemption(...)`.
  4. Recipient profile: existing user → **do not update** name/phone; reuse `clientProfile` if any (and its `stripeCustomerId`), else create one with a new Stripe customer. New user → `stripe.customers.create({ name, email })` first, then create `User` + `ClientProfile` (`marketingConsentAt: optOut ? null : new Date()`).
  5. Transfer: `prisma.photoShooting.updateMany({ where: { id, giftCode: code }, data: { clientId: recipient.id, purchasedById: shooting.purchasedById ?? shooting.clientId, giftCode: null } })`; `count !== 1` → same "már nem váltható be" error.
  6. Emails (failures logged + Discord `warning`, never undo): gift-received to recipient with a fresh `createClientPortalToken` link; gift-redeemed to buyer. If new user and marketing consent: publish `create-resend-contact`.
  7. `logIn` → `createSession(user.id, SessionKind.CLIENT)`, `(await cookies()).set(CLIENT_SESSION_COOKIE_NAME, raw, sessionCookieOptions(expiresAt))`, `redirect(APP_URLS.clientPortalShootingDetails(recipient.id, shooting.id))`. Else return `{ checkInbox: true }` and the form shows "Küldtünk egy emailt a(z) <email> címre, azzal tudsz belépni."
- [ ] **Step 6: Verify** — `pnpm test:run src/lib/gift.test.ts && pnpm typecheck && pnpm lint`. Manual QA: new email → lands logged in on details; existing email → inbox message, that user's name/phone unchanged; second submit / reopen → "már nem váltható be"; buyer gets redeemed email; shooting gone from buyer portal.
- [ ] **Step 7: Commit** — `feat: gift redemption page`

---

### Task 10: Recipient's first extra payment collects billing details

**Files:**
- Modify: `src/server/image-selection.ts` (`loadSelectableShooting` select + `confirmImageSelection` session options), `src/app/api/webhooks/stripe/route.ts` (`handleImageSelectionExtra`)

**Interfaces:**
- Consumes: `ClientProfile.billingAddresses`.

- [ ] **Step 1:** In `loadSelectableShooting`, also select `client.billingAddresses: { take: 1, select: { id: true } }`. In the extra session, when it is empty add `billing_address_collection: 'required'` and `name_collection: { individual: { enabled: true, optional: false } }`.
- [ ] **Step 2:** In `handleImageSelectionExtra`, before publishing the invoice job: if `session.customer_details` has `individual_name`, `address.postal_code`, `city`, `line1` **and** the shooting's client has no `BillingAddress`, create one for `shooting.clientId` (no `bookingIntentId`). Wrap like the deposit handler (log + Discord warning on failure; the invoice job's own "no billing address" alert still covers it).
- [ ] **Step 3: Verify** — `pnpm typecheck && pnpm lint`. Manual QA: redeemed recipient pays an extra → Stripe asks for name/address; extra invoice issued to recipient; next extra is not asked again.
- [ ] **Step 4: Commit** — `feat: collect billing details on a client's first extra payment`

---

### Task 11: Admin gift link + 🎁 marker, docs

**Files:**
- Create: `src/components/admin/GiftLinkRow.tsx` (client, copy button)
- Modify: `src/app/admin/(protected)/photo-shootings/[id]/page.tsx` (~line 215 name, details list)
- Modify: `src/docs/upcoming-work.md` §8 + open questions, `src/docs/redesign-status.md` if the new page is tracked there

**Interfaces:**
- Consumes: `PhotoShooting.giftCode`, `purchasedById`, `giftRedeemPath` (absolute URL built server-side with `env.NEXT_PUBLIC_SITE_URL`, passed to the client component as a string).

- [ ] **Step 1:** Prefix the client name with `🎁 ` when `purchasedById != null`. When `giftCode != null`, a `DetailRow`-style "Ajándék link" row showing the absolute URL and a copy button (`navigator.clipboard.writeText`, toast as elsewhere in admin). Nothing else.
- [ ] **Step 2:** `upcoming-work.md` §8: change the "Decided 2026-10-01: not building this" header to built-as-gift-purchase (2026-11-14), link the spec, record the könyvelő answer (one NORMAL invoice, completion = purchase date) and remove that item from Open questions.
- [ ] **Step 3: Verify** — `pnpm typecheck && pnpm lint && pnpm fmt && pnpm test:run`
- [ ] **Step 4: Commit** — `feat: gift link in admin; docs`
