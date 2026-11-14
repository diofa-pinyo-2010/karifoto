# Staff payouts — Esedékes card breakdown

## Intent

On `/admin/staff-payouts`, the „Esedékes” card shows only a total. Staff want
the same per-category line the „Összes kifizetés” card has
(`fotós X · szerk. Y · bónusz Z`) so they can see what the due amount is made of.

## Goals / non-goals

- Goal: per-category due breakdown under the Esedékes total, same format and
  order as the payouts card.
- Non-goal: changing the payout allocation, the account table, or tabs.
- Anti-goal: three numbers that don't add up to the headline total.

## Approaches

- **Chosen — earned − paid per category.** Add `dueByCategory` to
  `buildStaffAccount`: sum of item amounts per category minus
  `paidByCategory`. Sums exactly to `dueInCents`; can be negative per category
  when a fee shrank after it was paid (same as the total).
- Rejected — sum of per-item remaining, clamped at 0. Breaks the sum when an
  item is overpaid.

## Design

- `src/lib/staff-ledger.ts`: `StaffAccount` gains
  `dueByCategory: Record<StaffPayoutCategory, number>`.
- `src/app/admin/(protected)/staff-payouts/page.tsx`: Esedékes card gets a
  `CardContent` mirroring the payouts card line; all three categories always
  shown, negatives as-is.
- `src/lib/staff-ledger.test.ts`: breakdown sums to `dueInCents`; partial
  payout case.

## Left to the builder

Whether to share the rendered line between both cards via a small helper.
