# Portal balance-due block Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the amount still to pay in the studio, payable by card or cash, in the client portal's Pénzügyek section until the balance is paid.

**Architecture:** A pure visibility rule in `src/lib/balance-due.ts` (vitest-covered). `fetchPhotoShootingForClientPortal` computes `calculatePricing(...).totalToBePaid` from a separate pricing read and returns it as `totalToBePaidInCents` next to the existing payload. The details page renders a block above the invoice list.

**Tech Stack:** Next.js 16 App Router (Server Components), Prisma 7, vitest, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-11-25-portal-balance-due-design.md`

## Global Constraints

- No relative imports; use `@/`. Prisma types/enums come from `@/generated/prisma/client` / `@/generated/prisma/enums`.
- Amounts are integer fillér; render with `formatMoney()`.
- Export a symbol only when another file imports it.
- Copy is Hungarian; match the language of the comments in each file you edit.
- Show a single total only, with no breakdown.
- Extras owed after delivery (`WAITING_FOR_EXTRA_PAYMENT`) are out of scope.
- Verification: `pnpm test:run`, `pnpm typecheck`, `pnpm lint`, `pnpm fmt`. The user QAs the UI manually.

## Review Focus

- Cancelled shooting with money owed → no block (`isStatusBefore` returns true for `CANCELLED`). Test in Task 1.
- Fully paid shooting (e.g. a gift, `totalToBePaid === 0`) or an overpaid one (negative) → no block. Test in Task 1.
- Balance owed but status already `RAW_PHOTOS_UPLOAD` or later (extras phase) → no block. Test in Task 1.
- Shooting without a `pricing` snapshot → `totalToBePaidInCents: null` → no block, no crash. Test in Task 1 (`null` input).
- Staff viewing the portal (`access.as === 'admin'`) → same block. No special handling.

---

### Task 1: Visibility rule

**Files:**
- Create: `src/lib/balance-due.ts`
- Test: `src/lib/balance-due.test.ts`

**Interfaces:**
- Produces: `isBalanceDueInStudio(input: { status: PhotoShootingStatus; totalToBePaidInCents: number | null }): boolean`

- [ ] **Step 1: Write the failing tests** using `PhotoShootingStatus` from `@/generated/prisma/enums`:
  - `true` for each of `PHOTOGRAPHER_SELECTION`, `WAITING_FOR_THE_DATE`, `WAITING_FOR_BALANCE_PAYMENT` with `totalToBePaidInCents: 10000_00`
  - `false` for `CANCELLED` with `10000_00`
  - `false` for each of `RAW_PHOTOS_UPLOAD`, `WAITING_FOR_EXTRA_PAYMENT`, `COMPLETED` with `10000_00`
  - `false` for `WAITING_FOR_BALANCE_PAYMENT` with `0`, `-500_00` and `null`
- [ ] **Step 2: Run** `pnpm test:run src/lib/balance-due.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `isBalanceDueInStudio` with the logic `status !== CANCELLED && isStatusBefore(status, 'RAW_PHOTOS_UPLOAD') && total != null && total > 0`, importing `isStatusBefore` from `@/lib/constants`. Add a short comment saying why the explicit `CANCELLED` check is there.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add balance-due visibility rule for client portal`.

### Task 2: Query returns `totalToBePaidInCents`

**Files:**
- Modify: `src/lib/queries.ts` (`fetchPhotoShootingForClientPortal`, ~line 567)

**Interfaces:**
- Produces: `fetchPhotoShootingForClientPortal(id)` → `(PhotoShootingForClientPortal & { totalToBePaidInCents: number | null }) | null`. `PhotoShootingForClientPortal` itself stays unchanged.

- [ ] **Step 1: Implement.** After the access check passes, run a second `prisma.photoShooting.findUnique` selecting `pricing: true`, the `calculatePricing` shooting fields (`package`, `isLightPlaySelected`, `numberOfGuests`, `numberOfPets`, `totalEditedImages`, `totalRetouchedImages`, `isExpressPostProduction`), `adjustments: { select: { id, type, amountInCents, publicLabel } }` and `ledgerEntries: { select: { category, amountInCents } }`. Return `{ ...photoShooting, totalToBePaidInCents }`, where the value is `null` if `pricing` is null and `calculatePricing(...).totalToBePaid` otherwise. Do not filter ledger entries by buyer: the gift buyer's payments count. Add a comment saying the pricing internals are kept out of the portal payload on purpose. Return types can be inferred; don't export new types.
- [ ] **Step 2: Run** `pnpm typecheck`. Expected: no errors.
- [ ] **Step 3: Commit** `feat: compute remaining balance in client portal query`.

### Task 3: Pénzügyek block

**Files:**
- Modify: `src/app/client/[clientProfileId]/shooting/[photoShootingId]/details/page.tsx` (the `invoices` item, ~line 186, and next to `ClientPortalInvoices`)

**Interfaces:**
- Consumes: `isBalanceDueInStudio` (Task 1), `photoShooting.totalToBePaidInCents` (Task 2).

- [ ] **Step 1: Implement** a local `ClientPortalBalanceDue({ totalToBePaidInCents }: { totalToBePaidInCents: number })` component. The `invoices` item's content becomes a `flex flex-col gap-6` wrapper: the balance block (rendered only when `isBalanceDueInStudio(...)` is true) above `<ClientPortalInvoices … />`. The block shows a label (e.g. "Helyszínen fizetendő"), the amount via `formatMoney()` in large type, and muted text along these lines: "A fotózás napján a stúdióban fizethetitek bankkártyával vagy készpénzzel. A végösszeg a helyszínen változhat (pl. extra személyek, kis kedvencek)." Use brand tokens already on the page (`text-brand-muted`, `brand-eyebrow`) and a light bordered box, styled like the rest of the portal.
- [ ] **Step 2: Run** `pnpm typecheck && pnpm lint && pnpm fmt && pnpm test:run`. Expected: all pass.
- [ ] **Step 3: Commit** `feat: show studio balance due in client portal Pénzügyek`.
