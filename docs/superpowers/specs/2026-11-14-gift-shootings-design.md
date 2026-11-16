# Gift shootings — design

## Why

A real case: John Doe booked a shooting, paid the deposit, and paid the
balance in advance (recorded manually by staff). The shooting was a present
for his brother Jack, who came to the studio with his girlfriend and wants
every email from now on (image selection etc.).

Simply changing the email/name on John's record is ruled out by the business
owner: John is the customer of record — he paid. So the system needs a
**buyer** (who paid deposit + balance, and whose invoices stay his) separate
from the **recipient** (who gets the emails, the portal, does the image
selection and pays any extras under his own name/address/email).

The trigger for this design was the narrower complaint that the extra-payment
invoice always uses the stored billing address. That complaint is fully
covered by gifts; a generic "invoice this extra to someone else" option is
**not** being built.

## Goals

1. **Gift handover:** a buyer can hand a fully paid shooting to a recipient via
   a short link (`/ajandek/<giftCode>`). The recipient fills in name, email,
   phone; the shooting becomes theirs; they land logged in on their client
   portal.
2. **Gift purchase at booking:** on the booking summary page a "gift" checkbox
   turns the 10 000 Ft deposit checkout into a full-amount checkout, invoiced
   as one normal invoice, and the confirmation email carries the gift link.
3. **Staff visibility:** staff can see and copy a gift-purchased shooting's
   gift link in admin (e.g. to resend it to the buyer).

John's own case (the trigger) is handled manually by the user (direct
transfer); the system offers no gift link for shootings not bought as gifts.
If one is ever needed, a `giftCode` can be set directly in the database and
the normal `/ajandek/<code>` flow takes over.

## Non-goals

- A "use different billing details" option on every extra payment.
- Collecting money at the studio on a gift-paid shooting (e.g. an extra
  guest). No automated path; staff handle it manually for now.
- A "gift it" button in the buyer's own client portal.
- Printable gift card / PDF, and QR codes anywhere. The email shows the link; that's it.
- Splitting or reversing a handover (recipient → buyer). A second handover
  (recipient re-gifts) is allowed by the same mechanism, see below.

## Anti-goals

- The buyer's past invoices (előlegszámla, végszámla, full-amount invoice) must never
  be reissued or re-addressed to the recipient.
- A gift link must never be able to take over a shooting that is not fully
  paid or whose image selection has started.
- Nothing already-shared (the `/public` gallery URL, portal links in emails)
  may be enough to build a working gift link — this is why the URL uses a
  separate code and not the client/shooting IDs.

## Decisions (made with the user)

- **Approach A — move the shooting to the recipient.** On handover
  `PhotoShooting.clientId` becomes the recipient's `ClientProfile`, and a new
  nullable `PhotoShooting.purchasedById` keeps the buyer. Chosen over a
  separate `recipientId` column because every existing path (≈19 email send
  sites, portal access by `clientProfileId`, image selection, extra checkout,
  `SentEmail.clientId`) already follows `clientId`, so they all move to the
  recipient without edits, and future features default to the right person.
  The cost — the shooting disappears from the buyer's portal — is accepted.
- **Gift link = `/ajandek/<giftCode>`** with a short random `giftCode` column
  on `PhotoShooting`, not the `/client/<id>/shooting/<id>/gift` URL (those IDs
  are already shared) and not a hashed token table.
- **Eligibility** to show/submit the form: the shooting's balance is fully paid
  **and** status is before `USER_SELECTION`. Otherwise the page shows a
  "this shooting is not transferable" message.
- **After submit the recipient is logged straight into the client portal**
  (no separate success page).
- **The recipient also gets an email** — a rephrased booking confirmation
  ("X megajándékozott egy fotózással").
- **Gift purchase at booking:** checkbox block (icon, title, description) under
  the deposit info on `foglalas-osszegzese`. Checked → the deposit text is
  replaced by a gift text explaining that a gift is paid in full up front,
  the full amount is shown instead of 10 000 Ft, and checkout has a single
  line item "Fotózás" for the full amount.
- **Invoicing a gift purchase: one normal invoice** for the full amount — no
  előlegszámla, no végszámla. Confirmed by the user (accountant-side) on
  2026-11-14, answering the open könyvelő question in
  `src/docs/upcoming-work.md` §8. Issue date and completion date are both
  the purchase date — the current invoice behaviour (completion = now), so
  **no `completionDate` change**; this overrides §8's shooting-date idea.
- **Phone bookings:** the gift option is stored on `BookingIntent`
  (`isGift Boolean @default(false)`). Staff can set it on
  `/admin/remote-booking`; the summary page then shows the gift checkbox
  pre-checked. The existing deposit-request email is reused unchanged.
- **The ledger model follows `upcoming-work.md` §8** (see Data model).
- **Confirmation email for a gift purchase** is the existing booking
  confirmation email with an optional gift section (gift link) — same
  component, not a new one.

## How it works

### Data model

On `PhotoShooting`:

- `purchasedById String? @db.Uuid` → `ClientProfile` (relation name e.g.
  `"PurchasedShootings"`, index). Null = the client is also the buyer. Set
  **only on the first handover**; a re-gift changes `clientId` again but keeps
  the original buyer.
- `giftCode String? @unique` — Null = no live gift link. Nulled on successful
  handover, which makes the link single-use. Format (decided):
  - 8 chars, Crockford base32 alphabet (`0-9A-Z` minus `I L O U`), stored
    uppercase without separator, displayed as `XXXX-XXXX`
    (e.g. `/ajandek/KF7M-Q2XR`). ~10¹² combinations.
  - Generated in `src/lib/token.ts` next to the login code: `randomBytes(8)`,
    each byte `% 32` (unbiased, since 256 is a multiple of 32).
  - Lookup normalizes like `normalizeLoginCode`: strip separators, uppercase,
    validate against the alphabet/length before querying.
  - Stored in plain text (staff and the email display it); acceptable because
    a code can only claim a fully paid, fully invoiced shooting.
  - Collision: on `P2002` for `giftCode`, regenerate and retry, max 3, then
    throw.

Ledger, as designed in `src/docs/upcoming-work.md` §8 (read it — it explains
why one payment must stay one ledger row):

- new `LedgerEntryCategory.INCOME_CLIENT_PAYMENT_FULL` (sign +1);
- exhaustive `SETTLES_BALANCE: Record<LedgerEntryCategory, boolean>` in
  `constants.ts`, and `isBalanceCollected` reads it;
- extend `LedgerEntry_one_balance_per_photo_shooting_key`'s `WHERE` to both
  settling categories (hand-written SQL, `pnpm db:migrate:co`);
- update §8 from "not building" to "being built (gift purchase)" and close its
  könyvelő question.

On `BookingIntent`: `isGift Boolean @default(false)`.

New `EmailType` values for the two new emails: gift received (to the
recipient) and gift redeemed (to the buyer). The gift purchase confirmation
reuses the booking confirmation's type. _(Names: builder's call.)_

### Part 1 — gift handover

**Getting a link**

- Gift purchase at booking: the webhook sets `giftCode` (Part 2).
- Staff: on the admin shooting page, "Ajándék link" shows the link with a
  copy button when `giftCode` is set. No QR, no regenerate, and no way to
  create a code for a shooting that wasn't bought as a gift — those (like
  John's) are handled manually. After redemption `giftCode` is null, so
  nothing is shown.
- The admin shooting page shows a 🎁 before the client's name when
  `purchasedById` is set (= a redeemed gift). No buyer label.

**`/ajandek/[giftCode]` page** (public, no session required)

- Look up the shooting by `giftCode`. Unknown code → the same
  "not transferable / invalid link" message (don't distinguish).
- Eligible =
  `calculatePricing(...).totalToBePaid <= 0` **and**
  `status ∈ {PHOTOGRAPHER_SELECTION, WAITING_FOR_THE_DATE, WAITING_FOR_BALANCE_PAYMENT, RAW_PHOTOS_UPLOAD}`
  **and** every income `LedgerEntry` of the shooting has an `invoiceId`.
  The last clause is _my call_: invoice jobs run async and read the client's
  email/billing address when they run, so a handover while one is pending
  would send the buyer's invoice to the recipient. Status alone cannot say
  "balance paid" (a gift purchase is fully paid while still pre-shoot). Put the
  eligibility decision in a pure function with Vitest tests (repo convention).
- Eligible → "<Buyer name> megajándékozott egy fotózással! 🎄", date/time,
  package, and a form: name, email, phone (+ the same terms/marketing consent
  handling the booking form uses, builder to mirror). Not eligible → message.
- Styling: 2026 `brand-*` tokens, marketing-page conventions per
  `src/docs/redesign-status.md`.

**Submit (Server Action)** — re-checks eligibility server-side, then:

1. Refuse if the email equals the current client's email (Hungarian error).
2. Find or create the recipient: `User` upsert by email (as the webhook does),
   then `ClientProfile`. If the profile already exists, reuse its
   `stripeCustomerId`; otherwise create a Stripe customer (name, email)
   **before** the DB write. A DB failure afterwards leaves a harmless empty
   Stripe customer.
3. One transaction, guarded so two concurrent submits can't both win (e.g.
   `updateMany where { id, giftCode }` and require count 1): set
   `clientId = recipient`, `purchasedById = purchasedById ?? previous clientId`,
   `giftCode = null`.
4. After commit: send the gift-received email to the recipient (with a
   `ClientPortalToken` link like the booking confirmation, so the portal works
   from other devices) and a short "<recipient> beváltotta az ajándékot" email
   to the buyer. Then:
   - **email was new** (no `User` existed before step 2): create a CLIENT
     session (`createSession(userId, CLIENT)`), set the cookie the same way
     `/api/client-portal/verify` does, redirect to the recipient's portal
     shooting page;
   - **email already belonged to a `User`**: no session — typing an address
     proves nothing, and logging in would expose that person's portal to
     whoever holds the link. Show a "check your inbox" message; the emailed
     portal link logs them in.

   The gift-received email (with the portal link) is sent in both cases.

Email failures after the transfer must not undo it; log + Discord, like
elsewhere.

**What follows automatically:** all later emails, the portal, image selection,
and the extra checkout use `clientId` → recipient. The recipient has no
`BillingAddress` yet, so:

**Extra checkout change** (`confirmImageSelection` in
`src/server/image-selection.ts`): when the client has no `BillingAddress`,
create the session with `billing_address_collection: 'required'` and
`name_collection.individual` required, and have `handleImageSelectionExtra`
in the webhook save a `BillingAddress` for the client from
`session.customer_details` before publishing the invoice job (so
`generate-extra-invoice` finds it). The customer's email is already the
recipient's, since their Stripe customer was created with it.

**Invoices on a gift shooting:**

- **Full-amount invoice** (one normal invoice for the full amount) → buyer. Issued by
  the new `generate-full-amount-invoice` job right after payment (Part 2). No előlegszámla and
  no végszámla are ever issued for a gift purchase.
- **Extra invoices** (after handover) → recipient, via the existing
  `generate-extra-invoice` job, which takes the latest `BillingAddress` of
  `clientId` — no change needed there.
- The eligibility rule requires the full-amount invoice to exist before a handover,
  so it can never be issued to the recipient by mistake.

### Part 2 — gift purchase at booking

**Summary page** (`src/app/(foglalas)/foglalas-osszegzese/[bookingIntentId]`,
`BookingSummary`): add the gift checkbox block under the deposit info,
initially checked when `bookingIntent.isGift`. Checked → the deposit copy is
swapped for gift copy (a gift is paid in full up front; Hungarian wording is
the builder's call), and the full amount replaces the deposit amount. The checkbox value goes with the form to
`createCheckoutSession`, which saves it to `BookingIntent.isGift` and picks the
session shape from it. _(Not the dead `src/app/foglalas-veglegesitese/`.)_
The checkbox is plain component state initialised from `isGift`, not in the
URL: since `isGift` is saved on submit, returning from Stripe's `cancel_url`
already restores it; only an unsubmitted click is lost on refresh, which is
fine.

`/admin/remote-booking` gets a gift toggle that sets `isGift` on the intent.

**Full amount** — the same total the shooting will have after the webhook
(package + studio fee + light play + extra people + pets, minus the intent's
`PriceAdjustment`s such as early bird) = `calculatePricing().totalToBePaid`
with an empty ledger, over a snapshot built exactly as the webhook builds it
(`buildPricingSnapshot`). Guest/pet counts are typed live on the same form, so
the page computes the displayed amount with the same pure function on the
client, and `createCheckoutSession` recomputes it on the server from the
submitted counts — never trusting a submitted amount.

**Checkout session:** same options as the deposit session (billing address,
phone, name collection, `customer_update`), one line item "Fotózás" for the
full amount, metadata via a new member of `checkoutMetadataSchema`:
`{ kind: 'booking_gift', booking_intent_id }`, mapped to
`INCOME_CLIENT_PAYMENT_FULL` in `CHECKOUT_KIND_LEDGER_CATEGORY`. The schema
change forces a webhook case (that is the existing mechanism).

**Webhook `booking_gift` case:** reuse the deposit handler's body (user,
profile, billing address, shooting, pricing snapshot, slot un-reveal, intent
conversion, adjustment reparenting, orphan/double-sold handling) with these
differences — refactor the deposit handler to take the differences as
parameters rather than copy it:

- ledger row category `INCOME_CLIENT_PAYMENT_FULL`, amount = `amount_total`;
- generate and store `giftCode` on the shooting;
- publish `generate-full-amount-invoice` instead of `generate-deposit-invoice`;
- publish the gift confirmation email instead of the normal one;
- calendar event and Resend contact jobs as today.

If `amount_total` differs from the computed full amount, still record what was
paid (money moved) and alert on Discord.

**Full-amount invoice job** (`/api/jobs/generate-full-amount-invoice`): one
normal invoice (like `generate-extra-invoice`), customer = the booking's
`BillingAddress` (via the booking intent, like the deposit job), single item
"Fotózás" for the full amount, card payment, settled, issue and completion
date = purchase date (existing behaviour, `GenerateInvoiceInput` unchanged),
attached to the ledger entry. Follow the deposit invoice job's idempotency stance (claim **throws** on
Redis failure — a duplicate real invoice is worse than a delay), with a new
key helper in `src/lib/idempotency.ts`.

**Gift confirmation email** (to the buyer): rephrased booking confirmation —
it's a gift, the shooting is fully paid, here is the gift link
`/ajandek/<giftCode>`, hand it over whenever you like; if you come
yourself, you don't need to do anything. Still includes the buyer's portal
link (until handover the shooting is theirs). **Not a new component:** the
existing `src/emails/BookingConfirmation.tsx` gets an optional `giftUrl` prop.
When set: the "az előleg megérkezett" intro becomes a "teljes díj megérkezett"
one, and a gift block (link + "hand it over whenever you like") is shown;
everything else is unchanged. Same `EmailType`, `giftUrl` stored in
`SentEmail.variables`. Add a gift preview entry in
`src/lib/email-previews.tsx`.

## Known gap (accepted, later)

Money collected at the studio on a gift-paid shooting (e.g. more guests than
booked): `isBalanceCollected` is true, so there is no balance path, and
`generate-final-invoice` expects an advance invoice that doesn't exist. Staff
handle it manually. Also note from §8: admin `readOnlyDetails` flips at
booking for a fully paid shooting, so staff can't correct guest counts after
it — accepted.

## Left to the builder

- Email copy (Hungarian), email type names, gift block icon and copy.
- Exact admin UI placement of the gift link and the 🎁 marker.
- Build order inside the PR. Decided: **one PR** for both parts (only a gift
  purchase creates a `giftCode`, so Part 1 alone would be unreachable).
