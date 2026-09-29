# Image selection — the client picks their photos

**Not built yet.** The schema is in place; nothing writes it. This records the
design and, more importantly, the two things about this codebase that will
break a naive implementation.

## Table of Contents

- [The flow](#the-flow)
- [Why the status cannot simply be set](#why-the-status-cannot-simply-be-set)
- [Schema](#schema)
- [The one change to `resolveStatus`](#the-one-change-to-resolvestatus)
- [Who writes what, and when](#who-writes-what-and-when)
- [The payment step](#the-payment-step)
- [The editor's correction is free](#the-editors-correction-is-free)
- [Validation: the negative-number hole](#validation-the-negative-number-hole)
- [Still to build](#still-to-build)
- [Open questions](#open-questions)

---

## The flow

1. After the shooting, an admin pastes the PicDrop URL into **Nyers képek** on
   [the shooting's admin page](<../../src/app/admin/(protected)/photo-shootings/[id]/page.tsx>).
   Status becomes `RAW_PHOTOS_UPLOAD`.
2. A new **"Küldés válogatásra"** button sets `selectionRequestedAt` and emails
   the client. Status becomes `USER_SELECTION`.
3. The client opens the **Képválogatás** section of
   [their portal details page](../../src/app/client/[clientProfileId]/shooting/[photoShootingId]/details/page.tsx)
   and enters two numbers: how many images they want **edited**, and how many
   **retouched**. They see the price this produces before committing.
4. If the numbers cost nothing extra, submitting completes the step outright.
   If they do cost extra, the client pays through Stripe Checkout and the step
   completes when the webhook confirms payment. Either way
   `selectionCompletedAt` is set and the status moves to `EDITOR_SELECTION`,
   then to `FINAL_PHOTOS_UPLOAD` once an editor is assigned.
5. After retouching, the editor corrects the counts if the client picked more
   in PicDrop than they declared. That reopens a balance, which is either
   written off with a `PriceAdjustment` or collected with a payment link.

Going the other way — the editor finding _fewer_ images than declared, so the
studio owes money back — is out of scope. It computes to a negative balance
and reads as `COMPLETED`; it does not error.

## Why the status cannot simply be set

**`PhotoShootingStatus` is a projection of the row, not a state machine.**

`resolveStatus()` in [src/server/admin.ts](../../src/server/admin.ts) is a pure
function of the shooting's data, and `updatePhotoShooting()` recomputes it and
writes the result on **every** save — including saves that change something
unrelated. `recalculatePhotoShootingStatus()` is just
`updatePhotoShooting(id, {})`, wired to the **Refresh status** button at the top
of the admin page.

So a "Küldés válogatásra" button that writes `status: USER_SELECTION` directly
would be silently reverted the next time anyone edited any field on that
shooting, or pressed that button. The status has to become _derivable_ instead
— which is what `selectionRequestedAt` / `selectionCompletedAt` are for.

This is the single most important thing to understand before implementing.

## Schema

Already added to `PhotoShooting` in
[prisma/schema.prisma](../../prisma/schema.prisma):

```prisma
declaredEditedImages    Int?     // what the client said — frozen, audit only
declaredRetouchedImages Int?
totalEditedImages       Int  @default(0)   // the truth — drives the money
totalRetouchedImages    Int  @default(0)

selectionRequestedAt DateTime? @db.Timestamptz()
selectionCompletedAt DateTime? @db.Timestamptz()
```

Two deliberate splits here:

- **`total*` vs `declared*`.** Only `total*` is read by
  `calculateRemainingAmount()`, so there is exactly one input to the price.
  `declared*` is written once and never used in arithmetic — it exists so that
  "the client said 12, the editor counted 15" is answerable months later. They
  are `Int?`, not `@default(0)`, so "never declared" is distinguishable from
  "declared zero".
- **These live on `PhotoShooting`, not `PhotoShootingPricing`.** The pricing row
  is a rate card snapshotted at booking time — prices, rates, thresholds,
  allowance. Counts that the editor revises afterwards are not rates. (They were
  briefly on the pricing model; see [final-amount-calculation.md](./final-amount-calculation.md),
  whose snippets still show the old shape.)

## The one change to `resolveStatus`

One branch, inserted between the raw-images check and the editor check:

```ts
if (merged.rawImagesUrl == null) return RAW_PHOTOS_UPLOAD;

// Sent to the client, not yet returned.
if (
  merged.selectionRequestedAt != null &&
  merged.selectionCompletedAt == null
) {
  return USER_SELECTION;
}

if (merged.editorId == null) return EDITOR_SELECTION;
```

**The position matters.** It sits above the `toBePaid > 0 → WAITING_FOR_PAYMENT`
check at the end of the chain, which is what lets the client's numbers be
written before they have paid for them: the balance goes positive immediately,
but the status stays `USER_SELECTION` rather than jumping to
`WAITING_FOR_PAYMENT` mid-flow.

Everything after step 4 then falls out on its own. Once `selectionCompletedAt`
is set the chain falls through to `editorId == null → EDITOR_SELECTION`, and
then to `FINAL_PHOTOS_UPLOAD` when an editor is assigned. No extra code.

Note this contradicts the Phase 2 section of
[admin-auth-guide.md](./admin-auth-guide.md), which describes the action as a
`USER_SELECTION → FINAL_PHOTOS_UPLOAD` transition, skipping `EDITOR_SELECTION`.
That doc is wrong; fix it when this is built.

## Who writes what, and when

| Who    | When                                          | Writes                                     |
| ------ | --------------------------------------------- | ------------------------------------------ |
| Admin  | pastes raw URL                                | `rawImagesUrl`                             |
| Admin  | "Küldés válogatásra"                          | `selectionRequestedAt`                     |
| Client | submits the form                              | `declared*` **and** `total*` (same values) |
| Client | on payment (or immediately, if nothing extra) | `selectionCompletedAt`                     |
| Editor | any time after                                | `total*` only — never `declared*`          |

**The freeze point is `selectionCompletedAt`, not the first write.** If the
client submits, is sent to Stripe, and abandons checkout, then `declared*` and
`total*` are written but the step is not complete: the status stays
`USER_SELECTION`, the form stays open, and resubmitting overwrites both. That
is the wanted behaviour — they can correct themselves before paying — and it
means "locked after submit" really means _locked once paid_.

## The payment step

The extra is a second Stripe Checkout, and
[the webhook](../../src/app/api/webhooks/stripe/route.ts) needs a real dispatch
to support it. Today `handleCheckoutCompleted()` reads
`session.metadata.booking_intent_id` and **returns early if it is missing** — so
a second checkout flow would be silently dropped with a logged error. The
metadata check has to become a branch before that early return, not after it.

The new branch should:

- carry the shooting id in metadata (e.g. `metadata.image_selection_shooting_id`)
- write a `LedgerEntry` with `INCOME_CLIENT_PAYMENT_EXTRA` — the category and
  its label ("Extra díj") already exist and are unused
- set `selectionCompletedAt`

The zero-extra path skips Stripe entirely and sets `selectionCompletedAt` in the
server action.

Show the client their price with the same function that will charge them.
`calculateRemainingAmount()` is pure and takes `shooting` as a plain object, so
the preview passes candidate values rather than reimplementing the maths:

```ts
calculateRemainingAmount({
  pricing,
  adjustments,
  ledgerEntries,
  shooting: { ...shooting, totalEditedImages: n, totalRetouchedImages: m },
});
```

## The editor's correction is free

`calculateRemainingAmount()` is a balance — `charges − deductions − payments` —
not a one-shot invoice. So step 5 needs no new state:

- client declares 12 against an allowance of 10 → 2 extra → pays → an INCOME
  `LedgerEntry` appears → balance returns to 0
- editor later corrects to 15 → charges rise by 3 × rate → balance is positive
  again → `resolveStatus` returns `WAITING_FOR_PAYMENT` on its own

Writing it off is equally free: a `DEDUCTION` `PriceAdjustment` via the dialog
already on the admin page brings the balance back to 0, and the status becomes
`COMPLETED`.

One caveat on timing: `toBePaid > 0` is checked _after_
`finalImagesUrl == null → FINAL_PHOTOS_UPLOAD`. So if the editor corrects the
counts before uploading the finals, the status reads `FINAL_PHOTOS_UPLOAD`, not
`WAITING_FOR_PAYMENT` — the balance is outstanding but the status does not say
so until the work is delivered.

## Validation: the negative-number hole

The client's form input sets what they owe, so it must be validated
server-side as **non-negative integers**. This is not a guard against typos —
the confirmation dialog and Stripe's own summary handle those, and a client who
genuinely pays for 100 images wants 100 images. It is a guard against a real
hole.

`calculateRemainingAmount()` clamps one of the two terms and not the other:

```ts
const extraEdited = Math.max(0, shooting.totalEditedImages - pricing.packageEditedImagesAllowance);
...
+ extraEdited * pricing.extraEditedImageRateInCents
+ shooting.totalRetouchedImages * pricing.extraRetouchedImageRateInCents;   // unclamped
```

So `totalRetouchedImages: -50` _subtracts_ 50 × rate from the bill — and it
never meets the payment gate that would otherwise catch it. A negative extra
reads as "nothing owed", so the flow skips Stripe, sets `selectionCompletedAt`,
and `resolveStatus` finds `toBePaid > 0` false and returns `COMPLETED`. The
client marks themselves paid up by submitting a form.

Validate in the server action with `z.number().int().nonnegative()`, not by
clamping inside `calculateRemainingAmount()` — that function is also the preview
path and should report what is stored rather than quietly repairing it.

The same reasoning covers the below-allowance path generally: when the declared
count is under the allowance there is no payment step at all, so form validation
is the only gate there is.

## Still to build

- `selectionRequestedAt` branch in `resolveStatus()`, plus the "Küldés
  válogatásra" button — guarded so it cannot fire while `rawImagesUrl` is null
- A new `EmailType` value and its React Email template. The `CLIENT_EMAILS`
  registry in [send-client-email.ts](../../src/lib/resend/send-client-email.ts)
  is `satisfies Record<EmailType, …>`, so a missing template is a compile error
  — but the enum value needs a migration. The email should carry a fresh portal
  token via `createClientPortalToken()` / `clientPortalLoginUrl()`, since the
  client may open it on a device that has no `client_session`.
- The client form and its Server Action, in `src/server/` per the repo
  convention. It must re-check `getClientSession()` independently and row-scope
  the shooting to that client — being rendered on a gated page is not enough.
  Per the Phase 2 design this action is `client_session` **only**: staff can
  _view_ `/details` with an `admin_session`, but may not submit on the client's
  behalf.
- The second Stripe Checkout and the webhook branch described above.
- Editor-side editing of `total*`. `PhotoShootingUpdateSchema` in
  [admin.ts](../../src/server/admin.ts) covers only `PhotoShooting` columns that
  already existed; the two counts need adding to it.

## Open questions

- **What does the portal show once the editor has corrected the numbers?** The
  client sees a total they did not submit. Showing `declared*` next to `total*`
  is the honest option, but needs copy that does not read as an accusation.
- **How is the second payment collected when the editor corrects upward?** A new
  Checkout link by email, or an invoice settled offline. The `DEPOSIT_REQUEST`
  email and the `generate-deposit-invoice` job are the closest prior art.
- **Does the admin need to reopen a completed selection?** Clearing
  `selectionCompletedAt` would do it, but there is currently no UI and no record
  of who reopened it.
