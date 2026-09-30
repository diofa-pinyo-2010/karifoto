# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Karifoto — a Hungarian-language landing page, booking/checkout flow, staff admin
and client portal for Christmas photo shoots in a Budapest studio. Next.js 16
(App Router, React 19), Prisma 7 on PostgreSQL, Stripe Checkout, Resend +
React Email, szamlazz.hu invoicing, Upstash QStash/Redis, Google Calendar.
Deployed on Vercel.

All user-facing copy is Hungarian. Code is English; **many comments are
Hungarian** — match the language of the file you are editing.

## Commands

```bash
pnpm dev              # next dev
pnpm dev:qstash       # local QStash dev server (needed for /api/jobs/* work)
pnpm email:dev        # react-email preview of src/emails on :3001
pnpm build            # prisma generate → (prod only) migrate deploy → next build
pnpm typecheck        # next typegen && tsc --noEmit
pnpm lint             # oxlint         (lint:fix to autofix)
pnpm fmt              # oxfmt          (fmt:check for CI parity)
pnpm test             # vitest (watch) — test:run for one pass, as CI does


pnpm db:migrate       # prisma migrate dev
pnpm db:migrate:co    # migrate dev --create-only (hand-edit the SQL, see below)
pnpm db:generate      # regenerate client into src/generated/prisma
pnpm db:seed          # prisma/seed.ts — creates upcoming TimeSlots
pnpm db:reset         # migrate reset --force + seed
pnpm db:studio        # port 5555
```

CI (`.github/workflows/ci.yml`, every push) = `lint` + `fmt:check` + `typecheck`

- `test:run`.

**Vitest covers pure functions only** — `src/**/*.test.ts`, default `node`
environment, no jsdom/React Testing Library and no database. A single file is
`pnpm test:run src/lib/checkout-metadata.test.ts`; a single case is
`pnpm test:run -t '<name>'`. Anything needing a browser, Stripe or Postgres is
deliberately out of scope and stays manual QA, so the way to make risky code
testable here is to extract the decision into a pure function and test that —
see [checkout-metadata.ts](src/lib/checkout-metadata.ts) versus the webhook that
consumes it.

Tooling is **oxlint + oxfmt**, not ESLint/Prettier. Format before committing;
`fmt:check` failures break CI. oxfmt also sorts imports into groups
(react/next → external → `@/` internal → relative → types) and sorts Tailwind
classes against `src/app/globals.css`.

`postinstall` runs `prisma generate`, so a fresh `pnpm install` needs a `.env`
with `DIRECT_URL` set.

## Hard rules enforced by lint

- **No relative imports.** `no-restricted-imports` bans `./*` and `../*` — always
  use the `@/` alias (mapped to `src/`).
- Prisma client is generated to `src/generated/prisma` (gitignored; recreate with
  `pnpm db:generate`) — import from `@/generated/prisma/client` (models, `Prisma`)
  or `@/generated/prisma/enums` (enums), **never** from `@prisma/client`.

## Environment

`src/env.ts` (`@t3-oss/env-nextjs` + zod) is the only place env vars are read;
never touch `process.env` directly elsewhere (`src/lib/session.ts` reads
`NODE_ENV` — that is the one exception). Adding a var means editing both the
schema and `runtimeEnv`.

Groups: Postgres (`DATABASE_URL` pooled for the app via the `PrismaPg` adapter in
[src/lib/prisma.ts](src/lib/prisma.ts), `DIRECT_URL` for the Prisma CLI in
`prisma7.config.ts`), Stripe, `SUMUP_API_KEY`, `RESEND_API_KEY`,
`SZAMLAZZ_API_KEY`, Upstash (`QSTASH_*`, `UPSTASH_REDIS_REST_*`), Google service
account (`GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_PRIVATE_KEY` /
`GOOGLE_CALENDAR_ID`), `DISCORD_WEBHOOK_URL`, `CRON_SECRET`, the coming-soon pair,
`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CLARITY_ID`.

## The booking flow

The public funnel keeps **no client-side global state across pages** — the
selection travels in the URL query string
([src/lib/booking-selection.ts](src/lib/booking-selection.ts)):

1. **`/`** ([src/app/page.tsx](src/app/page.tsx), `force-dynamic`) lists future
   `TimeSlot`s grouped by Budapest-local day. `BookingSelectionProvider` holds the
   package/decor/light-play clicks and `TimeSlotAccordion` appends them to the
   link as `?package=&decor=&light=`.
2. **`/foglalas/[timeSlotId]`** re-reads the selection from `searchParams`,
   re-checks the slot is free/revealed/future, and renders `BookingFormNew`, whose
   submit calls `createBookingIntent`
   ([src/server/booking-intent.ts](src/server/booking-intent.ts)).
3. **`/foglalas-osszegzese/[bookingIntentId]`** renders `BookingSummary`; its form
   action is `createCheckoutSession`
   ([src/server/stripe.ts](src/server/stripe.ts)), which redirects to Stripe
   Checkout with `metadata.booking_intent_id`.
4. **`POST /api/webhooks/stripe`** — see below.
5. Stripe redirects to **`/success/[bookingIntentId]`**.

`src/app/foglalas-veglegesitese/[id]/` is the **pre-redesign version of step 3 and
is dead** — nothing links to it. Do not extend it; the live page is the one under
`src/app/(foglalas)/`.

There is a second, staff-driven path: **`/admin/remote-booking`** (phone bookings)
calls `getOrCreateTimeSlot` + `createBookingIntent` and lands on
`/admin/summary/[id]`, from which staff send a **deposit request** email carrying a
link back to the public summary page. Read
[src/lib/get-or-create-time-slot.ts](src/lib/get-or-create-time-slot.ts) before
touching slot creation — it deliberately refuses to mint a second slot at a time
someone may be paying for.

### The webhook is an orchestrator, not a worker

[src/app/api/webhooks/stripe/route.ts](src/app/api/webhooks/stripe/route.ts) does
only what must be transactional, then fans the rest out to QStash:

- verifies the signature, then `isEventProcessed(event.id)` (Redis `SET NX`);
  on a thrown handler it calls `releaseEvent` so Stripe's retry is not turned away
  by our own marker.
- routes the session by its **kind** (see below), then, for a booking deposit:
- upserts `User` + `ClientProfile` + `BillingAddress`, creates the `PhotoShooting`
  (idempotent — `timeSlotId` is `@unique`), snapshots prices into
  `PhotoShootingPricing`, un-reveals the slot, converts the `BookingIntent` and
  reparents its `PriceAdjustment`s.
- writes the income `LedgerEntry` **before** any third-party call — money moved,
  so it is recorded whether or not invoicing succeeds.
- publishes `email-confirmation`, `generate-deposit-invoice`, `calendar-event` and
  `create-resend-contact` jobs.

Two failure states return **200 with no retry** and instead flip the intent to
`PAYMENT_ORPHANED` and ping Discord: the slot vanished while the intent was
pending, and the slot was double-sold. Both need a human.

### Checkout session kinds

Stripe emits one event type (`checkout.session.completed`) for **every** payment
the studio will ever take, so each session we create carries a `kind` in its
metadata saying what the payment means.

Build metadata only with `buildCheckoutMetadata` and read it only with
`parseCheckoutMetadata` ([checkout-metadata.ts](src/lib/checkout-metadata.ts)),
so the two sides cannot drift. Adding a kind means adding a member to
`checkoutMetadataSchema`, which then **fails the build** until it has a case in
the webhook's switch and an entry in `CHECKOUT_KIND_LEDGER_CATEGORY` — that is
the mechanism, not a convention to remember.

Two rules worth keeping:

- The ledger category is derived from the kind in code, **never** carried in the
  metadata. Metadata is written at session-creation time and read much later, so
  a stored category would go stale if the mapping changed. Prices get
  snapshotted because the client agreed to them; an internal taxonomy does not.
- A session whose metadata does not parse is a **third** no-retry 200: it alerts
  on Discord naming the kind that arrived, and nothing else happens. A retry
  cannot fix an unknown kind, and falling through to the deposit handler would
  create a booking for someone paying for something else.

### Background work

- `src/app/api/jobs/*` — QStash consumers, wrapped in `verifySignatureAppRouter`.
  Convention: zod-parse the body, return **489 + `Upstash-NonRetryable-Error`** for
  a payload/entity that will never become valid, and `throw` (→ 500) for anything
  QStash should retry.
- `src/app/api/cron/*` — Vercel Cron (schedules in `vercel.json`), authorized by a
  `Bearer ${CRON_SECRET}` header. `ping-redis` exists to keep the free Upstash
  database from being reaped.
- [src/lib/idempotency.ts](src/lib/idempotency.ts) is the single home for every
  Redis key. Each helper documents its failure stance — the webhook guard
  fails _open_ so a Redis outage cannot block payments, email markers fail open so
  a duplicate beats a missing one, and the deposit-invoice claim **throws**,
  because re-issuing a real szamlazz.hu document is worse than a delay. Preserve
  those stances when editing.

## Auth (exists — two independent session kinds)

[src/proxy.ts](src/proxy.ts) (Next 16's middleware equivalent) does a cookie
_presence_ check on `/admin/:path*` only. **It is not the authorization boundary** —
every protected page must call into the DAL.

[src/lib/dal.ts](src/lib/dal.ts) is that boundary, all `cache()`-wrapped:

- `getSession()` / `verifySession()` — staff, `admin_session` cookie, requires
  `owner.staffProfile`.
- `requireNavAccess(href)` — per-page role gate that reads the allowed roles from
  [src/lib/admin-nav.ts](src/lib/admin-nav.ts), the same list the sidebar renders
  from. Fails closed: an href with no nav entry throws.
- `getClientSession()` / `getPortalAccess(clientProfileId)` /
  `requireClientAccess(clientProfileId)` — the client portal. `Session.kind`
  (`ADMIN` | `CLIENT`) means a token minted for one side can never resolve on the
  other, and the portal helpers additionally compare the id in the URL, because a
  valid client session proves _a_ client is logged in, not _this_ one.

Staff log in with a `MagicLinkToken` (single-use, 15 min). Clients bootstrap from a
long-lived reusable `ClientPortalToken` in their confirmation email — deliberately
_not_ single-use, so the link still works from a new device months later.

## Money

- **All amounts are integer cents (fillér)**, `39000_00` literal style in
  [src/lib/constants.ts](src/lib/constants.ts). Render with `formatMoney()`.
- `PhotoShootingPricing` is a **snapshot** taken at purchase — never recompute a
  past shooting's total from current constants.
- `LedgerEntry` is the money record (income and expense, signed via
  `LEDGER_ENTRY_CATEGORY_SIGN`), `PriceAdjustment` the discounts/deductions, and
  [`calculateRemainingAmount()`](src/server/pricing.ts) the one place that combines
  snapshot + shooting + adjustments + ledger into a balance. Background:
  [src/docs/final-amount-calculation.md](src/docs/final-amount-calculation.md).
- An `Invoice` attaches to an existing `LedgerEntry`; the invoice job never creates
  the ledger row itself.

## Time and localization

- **Every `Intl` formatter lives in
  [src/lib/formatters.ts](src/lib/formatters.ts)**, pinned to
  `timeZone: 'Europe/Budapest'` / `hu-HU`. Timestamps are `@db.Timestamptz` and the
  Postgres session runs UTC. Never format with the machine's local timezone; use
  `getBudapestDayKey` / `dayBounds` from `@/lib/utils` for day-bucketing.
- Pricing/package/FAQ/review copy is static data in
  [src/lib/data.ts](src/lib/data.ts) ("replace with a CMS later").

## Server actions

Mutations are Server Actions in [src/server/](src/server/) (`'use server'` at file
top), not route handlers. They return `{ error: '<Hungarian string>' }` rather than
throwing, and every staff-facing one starts with `await verifySession()`.

## Emails

React Email components in [src/emails/](src/emails/), senders in
[src/lib/resend/](src/lib/resend/). `sendClientEmail` records a `SentEmail` row;
admin emails are deliberately not recorded. `/admin/email-previews` renders them
in-app (registry in `src/lib/email-previews.tsx`), and `pnpm email:dev` is the
standalone preview.

## Styling

Tailwind v4, CSS-first config in [src/app/globals.css](src/app/globals.css) — there
is no `tailwind.config`.

**Two brand palettes currently coexist.** The old dark-green tokens (`forest`,
`cream`, `gold`, `terracotta`, `sage`, and an old `ink`) are being replaced by the
2026 `brand-*` tokens; the prefix exists because `ink`/`cream` clash across the two
and because unprefixed `muted` would silently repaint shadcn's admin UI. Check
[src/docs/redesign-status.md](src/docs/redesign-status.md) for what has migrated
before restyling a page, and follow the conventions section at its end.

Fonts are self-hosted (`src/fonts` via `next/font/local`, plus `@fontsource-variable`
for the subset-split families) so builds never depend on reaching Google Fonts.

shadcn/ui (style `base-nova`, Base UI primitives, lucide icons) lives in
[src/components/ui/](src/components/ui/) and is used almost exclusively by the
admin area; the marketing pages are hand-written Tailwind. Dark mode is a `.dark`
class toggled by an inline script in the root layout — admin only.

Gallery images must live in [src/photos/](src/photos/), **not** `public/`, so static
imports supply width/height/blurDataURL to `react-photo-album` and `next/image` —
see the comment block in [src/lib/fetch-photos.ts](src/lib/fetch-photos.ts).

## Design docs

[src/docs/](src/docs/) holds long-form design notes that explain _why_ the schema
and flows look the way they do — `admin-auth-guide.md` (incl. the Phase 2 client
portal), `final-amount-calculation.md`, `image-selection.md`,
`redesign-status.md`. Read the relevant one before changing auth, pricing, the
image-selection status machine, or page styling. They also list what is still
unbuilt, which is the honest answer to "does this exist yet".

[upcoming-work.md](src/docs/upcoming-work.md) is the forward-looking one: what is
decided but unbuilt across billing, payments and pricing — the invoice wrappers,
végszámla generation, SumUp + `PaymentAttempt`, the `calculateRemainingAmount`
breakdown, and `PriceAdjustment` surcharges. Read it before starting any of
those, and keep its open-questions list current.

## Coming-soon gate

`proxy.ts` rewrites `/` to `/coming-soon` when `COMING_SOON_ENABLED` is true, unless
the request carries the bypass cookie set by `/?preview=<COMING_SOON_PREVIEW_TOKEN>`.
Removal checklist: [COMING_SOON_TEARDOWN.md](COMING_SOON_TEARDOWN.md) — delete that
file when done.

## Migrations

Some invariants are enforced by **hand-written SQL added to a generated migration**
(e.g. the partial unique index that allows at most one
`StaffProfile.isDefaultEditor`). Use `pnpm db:migrate:co` when you need to add such
SQL, and never regenerate a migration that contains hand edits.

## Prisma skills

`.claude/skills/` contains vendored Prisma 7 skill docs (CLI, client API, driver
adapters, v6→v7 upgrade). Prefer them over recalled Prisma knowledge — v7 changed
the generator (`prisma-client`, custom output path), made driver adapters
mandatory, and moved config to `prisma7.config.ts`.
