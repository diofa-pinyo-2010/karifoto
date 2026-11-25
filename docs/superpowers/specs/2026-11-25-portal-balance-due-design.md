# Client portal — balance due block in "Pénzügyek"

## Intent

The remaining amount a client owes is shown nowhere today. Before the balance
is paid, the portal's Pénzügyek section shows one total, the amount to pay in
the studio, and says it can be paid by card or cash.

## Goals / non-goals

- Goal: a single total (no itemised breakdown), visible only while the balance is
  still owed.
- Non-goal: extras owed after delivery (`WAITING_FOR_EXTRA_PAYMENT`). Those go
  through Stripe only, not card/cash in the studio, so they stay out of this block.
- Non-goal: a payments list. Pénzügyek keeps listing invoices as it does now.
- Anti-goal: telling a client to bring card/cash for money that must go via
  Stripe, or showing a figure on a cancelled shooting.

## Approaches

- **A. Compute in the query (picked).** `fetchPhotoShootingForClientPortal` also
  reads `pricing`, `adjustments` and `ledgerEntries`, runs `calculatePricing()`
  and returns only `totalToBePaidInCents`. The page gets a single number, and
  the portal type doesn't carry price snapshots or the gift buyer's ledger rows.
- B. Compute in the page, like the admin page and `/success` do. Simpler, but it
  puts all the pricing internals into the portal's data shape.

Picked A because the portal only ever needs the total.

## Design

1. **Query** (`src/lib/queries.ts`): fetch the pricing relations separately from
   `photoShootingForClientPortalSelect` (they shouldn't end up in
   `PhotoShootingForClientPortal`), compute
   `calculatePricing(...).totalToBePaid` and return it next to the shooting as
   `totalToBePaidInCents`. With no `pricing` snapshot (shouldn't happen for a
   paid booking), return `null` and the block hides.
   The calculation counts *all* income rows on the shooting, including a gift
   buyer's, because that is the true remaining amount.
2. **Visibility rule**: a pure function, e.g.
   `isBalanceDueInStudio({ status, totalToBePaidInCents })`. True when the
   status is not `CANCELLED`, `isStatusBefore(status, 'RAW_PHOTOS_UPLOAD')`
   holds, and the amount is `> 0`. The `CANCELLED` check must be explicit,
   because `isStatusBefore` returns `true` for it. Covered by vitest.
3. **UI** (`details/page.tsx`, the `invoices` item): above the invoice list, a
   short block with `formatMoney(totalToBePaidInCents)`, a line saying it is
   paid in the studio on the day by card or cash, and a note that the amount
   may change on the spot (extra guests, pets, discounts).

## Left to the builder

- The exact Hungarian copy and styling. Match the brand tokens already used on
  the page (`text-brand-muted`, etc.).
- The file and function names for the visibility rule.
