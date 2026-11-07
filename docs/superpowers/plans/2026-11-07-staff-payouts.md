# Staff kifizetések Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SUPERADMIN-only `/admin/staff-payouts` page: per-staff running account of due fees/bonuses and payouts, payout recording split FIFO into per-item ledger rows, one-time review URL entry, and cash payouts deducted on Mai nap.

**Architecture:** Every decision is a pure function in `src/lib/staff-ledger.ts` (due items, account rows, FIFO allocation), Vitest-tested. A loader in `src/server/load-staff-ledger.ts` feeds it from Prisma (also inside the payout transaction). Server actions in `src/server/staff-payouts.ts`; the page is a server component with three small client components.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 7 (Postgres), zod, shadcn/ui (base-nova), Vitest.

**Spec:** `docs/superpowers/specs/2026-11-07-staff-payouts-design.md`

## Global Constraints

- All money is integer fillér; UI renders with `formatMoney()`; HUF input converts with `hufToCents()` (`src/lib/utils.ts`).
- Dates only via `src/lib/formatters.ts` (Europe/Budapest).
- No relative imports (`@/` only). Prisma from `@/generated/prisma/client` / `@/generated/prisma/enums`.
- Server actions: `'use server'`, `const { staffProfile } = await verifySession()`, then `if (staffProfile.role !== StaffProfileRole.SUPERADMIN) return { error: 'Nincs jogosultságod ehhez a művelethez.' }`; return `{ error: '<magyar>' } | { success: true }`, never throw.
- All user-facing copy Hungarian; comments match file language (staff-fees.ts: English; daily-income.ts / server actions: Hungarian).
- Export a symbol only once another file imports it.
- `GOOGLE_REVIEW_BONUS_IN_CENTS = 2000_00`.
- Payout methods offered: `CASH` („Készpénz”), `TRANSFER` („Utalás”).
- Expense ledger rows are stored **negative** (`LEDGER_ENTRY_CATEGORY_SIGN`).
- No UI to edit/delete payouts or change a filled `reviewUrl`.
- Before each commit: `pnpm fmt && pnpm lint && pnpm typecheck && pnpm test:run`.

## Review Focus

1. Double-submit of „Rögzítés” (or two admins at once) → must not create two payouts exceeding the due balance; second gets `{ error }`. Covered by the row lock in Task 5.
2. Shooting cancelled / fee reduced after payout → balance negative, dialog max 0, no crash, no new allocation. Test in Task 2 + Task 3.
3. Same review URL pasted on two taps → friendly Hungarian error from P2002, not a 500. Task 5.
4. Two admins fill the same empty tap → conditional write updates 0 rows → `{ error: 'Ennél a tapnél már ki van töltve a review URL.' }`. Task 5.
5. Payout amount 0, negative, fractional or above due → rejected by `allocatePayout` before any write. Test in Task 3.

---

### Task 1: Schema, constants, nav entry

**Files:**
- Modify: `prisma/schema.prisma` (models `StaffProfile`, `LedgerEntry`, `ReviewTap`, enum `LedgerEntryCategory`; new model `StaffPayout`)
- Create: `prisma/migrations/<timestamp>_add_staff_payouts/migration.sql` (generated)
- Modify: `src/lib/constants.ts` (`LEDGER_ENTRY_CATEGORY_SIGN`, `LEDGER_ENTRY_CATEGORY_LABEL`, `APP_URLS`, new constant)
- Modify: `src/lib/admin-nav.ts`

**Interfaces:**
- Produces: `LedgerEntryCategory.EXPENSE_STAFF_BONUS`; `StaffPayout` model; `LedgerEntry.staffPayoutId`, `LedgerEntry.reviewTapId`; `ReviewTap.reviewUrlSetAt`; `GOOGLE_REVIEW_BONUS_IN_CENTS`; `APP_URLS.staffPayouts = '/admin/staff-payouts'`.

- [ ] **Step 1: Edit schema**
  - enum `LedgerEntryCategory`: add `EXPENSE_STAFF_BONUS` after `EXPENSE_EDITOR_FEE`.
  - new model `StaffPayout` exactly as in the spec („Adatmodell”); relation name on `StaffProfile`: `staffPayouts StaffPayout[]`.
  - `LedgerEntry`: `staffPayout StaffPayout? @relation(fields: [staffPayoutId], references: [id], onDelete: Restrict)`, `staffPayoutId String? @db.Uuid`, `reviewTap ReviewTap? @relation(fields: [reviewTapId], references: [id], onDelete: Restrict)`, `reviewTapId String? @db.Uuid`, plus `@@index([staffPayoutId])`, `@@index([reviewTapId])`. Update the existing comment above `staffProfile` to include `EXPENSE_STAFF_BONUS`.
  - `ReviewTap`: `reviewUrlSetAt DateTime? @db.Timestamptz()` next to `reviewUrl`, `ledgerEntries LedgerEntry[]`.
- [ ] **Step 2: Generate migration** — `pnpm db:migrate --name add_staff_payouts`. Expected: migration created and applied, client regenerated.
- [ ] **Step 3: Constants** — sign `EXPENSE_STAFF_BONUS: -1`; label `'Staff bónusz'`; `export const GOOGLE_REVIEW_BONUS_IN_CENTS = 2000_00;` next to `GOOGLE_REVIEW_URL`; `staffPayouts: '/admin/staff-payouts'` in `APP_URLS`.
- [ ] **Step 4: Nav** — in „Csak admin” group, after „Statisztikák”: `{ title: 'Staff kifizetések', href: APP_URLS.staffPayouts, icon: WalletIcon, allowedRoles: [StaffProfileRole.SUPERADMIN] }` (`WalletIcon` from lucide-react).
- [ ] **Step 5: Verify** — `pnpm typecheck && pnpm test:run`. Expected: pass (Record types force sign/label entries).
- [ ] **Step 6: Commit** — `feat: staff payout schema and constants`.

---

### Task 2: Due items and account summary (pure)

**Files:**
- Create: `src/lib/staff-ledger.ts`
- Test: `src/lib/staff-ledger.test.ts`

**Interfaces:**
- Consumes: `calculatePhotographerFee`, `calculateEditorFee` from `@/lib/staff-fees`; `isStatusBefore` from `@/lib/constants`.
- Produces (all exported, used by Tasks 3, 5, 6):

```ts
export type DueItemKind = 'PHOTOGRAPHER_FEE' | 'EDITOR_FEE' | 'REVIEW_BONUS';

export type DueItem = {
  key: string;                       // `${category}:${photoShootingId ?? reviewTapId}`
  kind: DueItemKind;
  category: LedgerEntryCategory;     // EXPENSE_PHOTOGRAPHER_FEE | EXPENSE_EDITOR_FEE | EXPENSE_STAFF_BONUS
  dueAt: Date;
  amountInCents: number;
  photoShootingId: string | null;
  reviewTapId: string | null;
};

export type LedgerShooting = FeeShooting-fields & Pick<PhotoShooting,
  'id' | 'status' | 'photographerId' | 'editorId' | 'completedAt'> & {
  pricing: PhotoShootingPricing | null;
  timeSlot: { startTime: Date };
  balancePaidAt: Date | null;        // createdAt of its INCOME_CLIENT_PAYMENT_BALANCE row
};

export type LedgerTap = Pick<ReviewTap, 'id' | 'staffProfileId' | 'bonusInCents' | 'reviewUrlSetAt'>;

export type PaidLedgerEntry = Pick<LedgerEntry,
  'category' | 'amountInCents' | 'photoShootingId' | 'reviewTapId'>;

export type LedgerPayout = Pick<StaffPayout, 'id' | 'amountInCents' | 'method' | 'note' | 'createdAt'> & {
  ledgerEntries: PaidLedgerEntry[];
};

export function collectDueItems(staffProfileId: string, shootings: LedgerShooting[], taps: LedgerTap[]): DueItem[];
export function dueItemKey(entry: PaidLedgerEntry): string;
export function paidByItemKey(entries: PaidLedgerEntry[]): Map<string, number>; // positive fillér

export type ItemPaidState = 'DUE' | 'PARTIAL' | 'PAID';
export type AccountRow =
  | { type: 'ITEM'; at: Date; item: DueItem; paidInCents: number; state: ItemPaidState; balanceAfter: number }
  | { type: 'PAYOUT'; at: Date; payout: LedgerPayout; balanceAfter: number };

export type StaffAccount = {
  dueInCents: number;                // may be negative
  paidTotalInCents: number;
  paidByCategory: Record<'EXPENSE_PHOTOGRAPHER_FEE' | 'EXPENSE_EDITOR_FEE' | 'EXPENSE_STAFF_BONUS', number>;
  rows: AccountRow[];                // newest first
};
export function buildStaffAccount(items: DueItem[], payouts: LedgerPayout[]): StaffAccount;
```

Rules `collectDueItems` encodes (skip CANCELLED and `pricing == null` shootings entirely):
- Photographer item when `photographerId === staffProfileId` and (`balancePaidAt != null` → `dueAt = balancePaidAt`; else if `!isStatusBefore(status, RAW_PHOTOS_UPLOAD)` → `dueAt = timeSlot.startTime`; else none). Amount = `calculatePhotographerFee`.
- Editor item when `editorId === staffProfileId` and `status === COMPLETED`; `dueAt = completedAt ?? timeSlot.startTime`. Amount = `calculateEditorFee`.
- Bonus item when `tap.staffProfileId === staffProfileId && tap.reviewUrlSetAt != null && tap.bonusInCents != null`.
- Items with amount 0 are dropped.

`buildStaffAccount`: events sorted ascending by `at` (items by `dueAt`, payouts by `createdAt`; tie → item before payout), running balance `+item.amountInCents` / `−payout.amountInCents`, then reversed. `paidTotalInCents = Σ payout.amountInCents`. `paidInCents` per item from `paidByItemKey` over all payouts' entries; state `PAID` when `paid >= amount`, `PARTIAL` when `0 < paid < amount`, else `DUE`.

- [ ] **Step 1: Write failing tests** in `src/lib/staff-ledger.test.ts` (reuse the fixture style of `staff-fees.test.ts`: synthetic `makePricing()`, `PACKAGE_FEE = 4_000_00`, `ME`/`OTHER`):
  - `photographer fee is due at the balance payment` — `balancePaidAt = T1` → one item, `dueAt === T1`, amount `PACKAGE_FEE`, key `'EXPENSE_PHOTOGRAPHER_FEE:shooting-1'`.
  - `photographer fee with nothing to collect is due at the shooting time` — `balancePaidAt null`, status `RAW_PHOTOS_UPLOAD` → `dueAt === timeSlot.startTime`.
  - `photographer fee is not due while waiting for the balance` — status `WAITING_FOR_BALANCE_PAYMENT`, `balancePaidAt null` → `[]`.
  - `editor fee is due only when completed` — `EDITOR_SELECTION` → `[]`; `COMPLETED` with `completedAt = T2`, 10 edited images → amount `10 * PER_EDITED_FEE`, `dueAt === T2`.
  - `photographer and editor on the same shooting are two items`.
  - `cancelled shootings and shootings without pricing earn nothing`.
  - `review bonus is due once the url is set` — tap with `reviewUrlSetAt = T3`, `bonusInCents = 2000_00` → item `kind 'REVIEW_BONUS'`, `reviewTapId` set; tap with `reviewUrlSetAt null` → none; tap of `OTHER` → none.
  - `account balance is items minus payouts, newest first` — 8 items × `4_000_00`, then a payout of `32_000_00` whose entries cover all 8 → `dueInCents 0`, `rows[0].type === 'PAYOUT'`, `rows[0].balanceAfter === 0`, every item `state === 'PAID'`, `paidByCategory.EXPENSE_PHOTOGRAPHER_FEE === 32_000_00`.
  - `partly paid item is PARTIAL`.
  - `balance goes negative when an item disappears after payout` (Review Focus 2) — payout of `4_000_00` with no remaining items → `dueInCents === -4_000_00`.
- [ ] **Step 2: Run** `pnpm test:run src/lib/staff-ledger.test.ts` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `src/lib/staff-ledger.ts` per the interfaces and rules above. Export `FeeShooting` from `staff-fees.ts` only if you reference it by name (else inline the `Pick`).
- [ ] **Step 4: Run** the same command — Expected: PASS.
- [ ] **Step 5: Commit** — `feat: staff ledger due items and account`.

---

### Task 3: FIFO payout allocation (pure)

**Files:**
- Modify: `src/lib/staff-ledger.ts`
- Test: `src/lib/staff-ledger.test.ts`

**Interfaces:**
- Consumes: `DueItem`, `PaidLedgerEntry`, `paidByItemKey`, `buildStaffAccount` from Task 2.
- Produces:

```ts
export type PayoutAllocation = { item: DueItem; amountInCents: number };
export function allocatePayout(
  items: DueItem[],
  payouts: LedgerPayout[],
  amountInCents: number,
): { ok: true; allocations: PayoutAllocation[] } | { ok: false; error: string };
```

Algorithm: reject unless `Number.isInteger(amountInCents) && amountInCents > 0` → `'Adj meg egy pozitív összeget.'`. `due = buildStaffAccount(items, payouts).dueInCents`; if `amountInCents > Math.max(0, due)` → `` `Legfeljebb ${formatMoney(Math.max(0, due))} fizethető ki.` ``. Then walk items sorted by `dueAt` asc (tie: key asc), `remaining = amount − paid(key)`, skip `remaining <= 0`, take `min(remaining, left)` until `left === 0`.

- [ ] **Step 1: Failing tests:**
  - `pays the oldest items first` — items A(T1, 4 000), B(T2, 4 000), C(T3, 2 000 bonus), pay `6_000_00` → `[{A, 4_000_00}, {B, 2_000_00}]`.
  - `skips items already paid` — A fully paid by an earlier payout, pay `4_000_00` → `[{B, 4_000_00}]`.
  - `continues a partly paid item` — A paid `1_000_00`, pay `3_000_00` → `[{A, 3_000_00}]`.
  - `rejects more than the due balance` (Review Focus 5) — due `10_000_00`, pay `10_000_01` → `ok: false`.
  - `rejects zero, negative and fractional amounts` (Review Focus 5).
  - `rejects any amount when the balance is negative` (Review Focus 2) — `ok: false` for `1_00`.
- [ ] **Step 2: Run** `pnpm test:run src/lib/staff-ledger.test.ts` — Expected: new cases FAIL.
- [ ] **Step 3: Implement** `allocatePayout`.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** — `feat: FIFO staff payout allocation`.

---

### Task 4: Mai nap — cash staff payouts reduce the brifkó

**Files:**
- Modify: `src/lib/daily-income.ts`, `src/lib/daily-income.test.ts`
- Modify: `src/app/admin/(protected)/today/page.tsx` (cash card description)

**Interfaces:**
- Produces: `summarizeDailyIncome` return gains `staffPayoutCash: number` (positive fillér); `cashBox = cash + dailyChangeInCents − staffPayoutCash`.

- [ ] **Step 1: Tests** — add `staffPayoutCash: 0` to the existing `toEqual` expectation; new case `subtracts cash staff payouts from the cash box`: cash balance `25_000_00`, change `10_000_00`, entries `EXPENSE_PHOTOGRAPHER_FEE CASH -8_000_00`, `EXPENSE_STAFF_BONUS CASH -2_000_00`, `EXPENSE_EDITOR_FEE TRANSFER -5_000_00` → `staffPayoutCash 10_000_00`, `cashBox 25_000_00`, `total`/`cash` unchanged.
- [ ] **Step 2: Run** `pnpm test:run src/lib/daily-income.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** — staff payout categories = the three `EXPENSE_*` staff categories; sum `−amountInCents` where `method === CASH`. Update the Hungarian doc comment (brifkó = készpénzes bevétel + váltó − készpénzes staff kifizetés).
- [ ] **Step 4: Page** — in the „Készpénzes bevétel” card description, between Váltó and Brifkó: `<p>Staff kifizetés: −{formatMoney(income.staffPayoutCash)}</p>`. No other card changes.
- [ ] **Step 5: Run** `pnpm test:run && pnpm typecheck` — Expected: PASS.
- [ ] **Step 6: Commit** — `feat: deduct cash staff payouts on Mai nap`.

---

### Task 5: Loader and server actions

**Files:**
- Create: `src/server/load-staff-ledger.ts` (`import 'server-only'`)
- Create: `src/server/staff-payouts.ts` (`'use server'`)

**Interfaces:**
- Consumes: Task 2/3 exports; `GOOGLE_REVIEW_BONUS_IN_CENTS`, `APP_URLS.staffPayouts`.
- Produces:

```ts
// load-staff-ledger.ts
type Db = Prisma.TransactionClient | typeof prisma;
export async function loadStaffLedger(db: Db, staffProfileId: string): Promise<{
  items: DueItem[];
  payouts: LedgerPayout[];
  shootings: { id: string; clientName: string; startTime: Date }[]; // for row labels
  taps: { id: string; createdAt: Date; standLabel: string; reviewUrl: string | null;
          reviewUrlSetAt: Date | null; bonusInCents: number | null }[]; // newest first
}>;

// staff-payouts.ts
export async function recordStaffPayout(input: {
  staffProfileId: string; amountHuf: number; method: 'CASH' | 'TRANSFER'; note: string | null;
}): Promise<{ success: true } | { error: string }>;
export async function setReviewTapUrl(reviewTapId: string, url: string | null)
  : Promise<{ success: true } | { error: string }>;
```

Loader queries: shootings where `photographerId` or `editorId` = staff, not CANCELLED, include `pricing`, `timeSlot.startTime`, client owner name, and `ledgerEntries` filtered to `INCOME_CLIENT_PAYMENT_BALANCE` (→ `balancePaidAt` = its `createdAt`); taps where `staffProfileId` = staff, include `stand.label`; `staffPayout.findMany({ where: { staffProfileId }, include: { ledgerEntries: { select: category, amountInCents, photoShootingId, reviewTapId } } })`.

`recordStaffPayout`:
1. SUPERADMIN gate; zod: `staffProfileId` uuid, `amountHuf` positive int, `method` enum, `note` trimmed ≤ 500 or null.
2. `prisma.$transaction(async (tx) => …)`: first `await tx.$queryRaw\`SELECT id FROM "StaffProfile" WHERE id = ${id}::uuid FOR UPDATE\`` (Review Focus 1 — serializes concurrent payouts for one staff); 0 rows → `'Nem találjuk ezt a munkatársat.'`. Then `loadStaffLedger(tx, id)`, `allocatePayout(...)`; on `ok: false` throw a local error class carrying the message and return it as `{ error }`.
3. Create `StaffPayout` with nested `ledgerEntries.create` — one per allocation: `category: item.category`, `amountInCents: -a.amountInCents`, `method`, `staffProfileId`, `photoShootingId`/`reviewTapId` from the item.
4. `revalidatePath(APP_URLS.staffPayouts)` and `revalidatePath(APP_URLS.today)`. Unexpected error → log + `'Nem sikerült rögzíteni a kifizetést. Próbáld újra.'`.

`setReviewTapUrl`:
1. SUPERADMIN gate; `reviewTapId` uuid; url `z.url()` after trim, empty → `'Adj meg egy érvényes linket.'`.
2. `prisma.reviewTap.updateMany({ where: { id, reviewUrl: null, staffProfileId: { not: null } }, data: { reviewUrl, reviewUrlSetAt: new Date(), bonusInCents: GOOGLE_REVIEW_BONUS_IN_CENTS } })`; `count === 0` → `'Ennél a tapnél már ki van töltve a review URL.'` (Review Focus 4).
3. P2002 → `'Ez a review URL már egy másik taphez tartozik.'` (Review Focus 3).
4. `revalidatePath(APP_URLS.staffPayouts)`.

- [ ] **Step 1: Implement** both files.
- [ ] **Step 2: Verify** `pnpm typecheck && pnpm lint` — Expected: clean.
- [ ] **Step 3: Commit** — `feat: staff payout and review url actions`.

---

### Task 6: Page and components

**Files:**
- Create: `src/app/admin/(protected)/staff-payouts/page.tsx`
- Create: `src/components/admin/staff-payouts/StaffAccountTable.tsx` (`'use client'`, expandable payout rows)
- Create: `src/components/admin/staff-payouts/RecordPayoutDialog.tsx` (`'use client'`)
- Create: `src/components/admin/staff-payouts/ReviewTapUrlField.tsx` (`'use client'`)
- Modify: `src/lib/queries.ts` — `fetchStaffPayoutTabs()`

**Interfaces:**
- Consumes: `loadStaffLedger`, `buildStaffAccount`, `recordStaffPayout`, `setReviewTapUrl`.
- Produces: `fetchStaffPayoutTabs(): Promise<{ id: string; nickname: string; dueInCents: number }[]>` — staff with `isPhotographer || isEditor` or any payout/tap, ordered by nickname; `dueInCents` via `loadStaffLedger(prisma, id)` + `buildStaffAccount` (small staff count; per-staff loop is acceptable).

Layout (approved mockup v3, „A”):
- `requireNavAccess(APP_URLS.staffPayouts)`. `searchParams.staff` selects the staff; missing/unknown → first tab.
- Tabs: `Link` pills `?staff=<id>` showing `nickname · formatMoney(dueInCents)`.
- Header: nickname + `RecordPayoutDialog` trigger „+ Kifizetés rögzítése”.
- Two `Card`s: „Esedékes” = `dueInCents`; „Összes kifizetés” = `paidTotalInCents`, description `fotós … · szerk. … · bónusz …` from `paidByCategory`.
- „Folyószámla” table (`ui/table`): Dátum (`shortFullDateFormatter` or nearest existing date-time formatter) · Tétel (Badge: „Fotós díj” / „Szerkesztői díj” / „Review bónusz” / „Kifizetés · Készpénz|Utalás”, plus „kifizetve”/„részben” badge from `state`) · Kapcsolódik (client name + time for shootings, linked via `APP_URLS.photoShootingAdminPage`; „Tap <dátum> · <stand>” for bonuses; „N tétel” for payouts, + note) · Összeg (`+`/`−`) · Egyenleg (`balanceAfter`). Payout rows toggle child rows listing each ledger entry (label, link, amount). Empty state: „Még nincs esedékes tétel.”
- „<nickname> review tapjei” table: Tap ideje · Stand · Review URL · Bónusz. URL cell: `ReviewTapUrlField` — empty → `EditableTextField` with `onSave={(v) => setReviewTapUrl(id, v)}`, placeholder „Review URL beillesztése…”; filled → `<a target="_blank" rel="noreferrer">` + set time, no edit button. Bónusz: amount + „esedékes”/„kifizetve” from the matching account item, „—” when unset. Empty state: „Nincs review tap.”
- `RecordPayoutDialog`: fields Összeg (Ft, number input, default `Math.max(0, dueInCents) / 100`), Mód (radio-group: Készpénz / Utalás, default Készpénz), Megjegyzés (textarea, optional); submit disabled while pending; shows `{ error }` inline; closes on success. Trigger disabled when `dueInCents <= 0`.

- [ ] **Step 1: Implement** query, page, components.
- [ ] **Step 2: Verify** `pnpm fmt && pnpm lint && pnpm typecheck && pnpm test:run` — Expected: all pass.
- [ ] **Step 3: Manual QA handoff** — list for the user (they test manually): record balance → photographer row appears; complete project → editor row; fill tap URL → bonus row, field locks; record cash payout → balance 0, Mai nap brifkó drops; second click / over-amount rejected.
- [ ] **Step 4: Commit** — `feat: staff payouts admin page`.
