# Staff payouts — Esedékes breakdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show `fotós X · szerk. Y · bónusz Z` under the Esedékes total on `/admin/staff-payouts`.

**Architecture:** `buildStaffAccount` gains `dueByCategory` (earned per category − `paidByCategory`); the page renders it like the payouts card.

**Tech Stack:** Next.js 16, TypeScript, Vitest, shadcn Card.

**Spec:** `docs/superpowers/specs/2026-11-14-staff-payouts-due-breakdown-design.md`

## Global Constraints

- Amounts are integer cents; render with `formatMoney()`.
- `@/` imports only; oxfmt formatting (`pnpm fmt`) before commit.
- Breakdown must sum exactly to `dueInCents`; negatives shown as-is, never clamped.
- Order and labels identical to payouts card: `fotós` · `szerk.` · `bónusz`, all three always shown.

## Review Focus

- Payout entry for an item that no longer exists (fee removed after payout) → that category goes negative, sum still equals `dueInCents`. Test in Task 1.
- Staff with no items and no payouts → all three `0 Ft`. Covered by existing empty behaviour; assertion added in Task 1.

---

### Task 1: `dueByCategory` in `buildStaffAccount`

**Files:**

- Modify: `src/lib/staff-ledger.ts` (`StaffAccount` type, `buildStaffAccount`)
- Test: `src/lib/staff-ledger.test.ts` (`describe('buildStaffAccount')`)

**Interfaces:**

- Produces: `StaffAccount.dueByCategory: Record<StaffPayoutCategory, number>` (keys `EXPENSE_PHOTOGRAPHER_FEE`, `EXPENSE_EDITOR_FEE`, `EXPENSE_STAFF_BONUS`).

- [ ] **Step 1: Write failing tests** in `describe('buildStaffAccount')`:

```ts
it('breaks the due balance down by category', () => {
  const photo = makeItem('shooting-1', T1);
  const editor = {
    ...makeItem('shooting-1', T1, 2_000_00),
    key: `${LedgerEntryCategory.EXPENSE_EDITOR_FEE}:shooting-1`,
    kind: 'EDITOR_FEE',
    category: LedgerEntryCategory.EXPENSE_EDITOR_FEE,
  } satisfies DueItem;
  const account = buildStaffAccount(
    [photo, editor],
    [makePayout(T2, [{ item: photo, amountInCents: 1_000_00 }])],
  );

  expect(account.dueByCategory).toEqual({
    EXPENSE_PHOTOGRAPHER_FEE: PACKAGE_FEE - 1_000_00,
    EXPENSE_EDITOR_FEE: 2_000_00,
    EXPENSE_STAFF_BONUS: 0,
  });
  expect(Object.values(account.dueByCategory).reduce((a, b) => a + b, 0)).toBe(
    account.dueInCents,
  );
});

it('shows a negative category when an item disappears after its payout', () => {
  const gone = makeItem('shooting-1', T1);
  const account = buildStaffAccount(
    [],
    [makePayout(T2, [{ item: gone, amountInCents: PACKAGE_FEE }])],
  );

  expect(account.dueByCategory.EXPENSE_PHOTOGRAPHER_FEE).toBe(-PACKAGE_FEE);
});

it('is all zero for an empty account', () => {
  expect(buildStaffAccount([], []).dueByCategory).toEqual({
    EXPENSE_PHOTOGRAPHER_FEE: 0,
    EXPENSE_EDITOR_FEE: 0,
    EXPENSE_STAFF_BONUS: 0,
  });
});
```

- [ ] **Step 2: Run** `pnpm test:run src/lib/staff-ledger.test.ts` — expect the 3 new tests FAIL (`dueByCategory` undefined).

- [ ] **Step 3: Implement.** Add `dueByCategory` to `StaffAccount` with a short doc comment (sums to `dueInCents`, can be negative). In `buildStaffAccount`, start from item amounts summed per `item.category`, subtract `paidByCategory`.

- [ ] **Step 4: Run** `pnpm test:run src/lib/staff-ledger.test.ts` — all PASS.

- [ ] **Step 5: Commit** `feat: per-category due breakdown in staff account`.

### Task 2: Render on the Esedékes card

**Files:**

- Modify: `src/app/admin/(protected)/staff-payouts/page.tsx` (Esedékes `Card`)

**Interfaces:**

- Consumes: `account.dueByCategory` from Task 1.

- [ ] **Step 1: Implement.** Add a `CardContent className="text-xs text-muted-foreground"` to the Esedékes card with the same line as the payouts card, reading `account.dueByCategory`.
- [ ] **Step 2: Verify** `pnpm typecheck && pnpm lint && pnpm fmt:check` — all clean. (Visual check is the user's manual QA.)
- [ ] **Step 3: Commit** `feat: show due breakdown on staff payouts page`.
