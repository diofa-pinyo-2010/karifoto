# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Karifoto — a Hungarian-language landing page + booking/checkout flow for Christmas
photo shoots in a Budapest studio. Next.js 16 (App Router, React 19), Prisma 7 on
PostgreSQL, Stripe Checkout, Resend email, szamlazz.hu invoicing. Deployed on Vercel.
All user-facing copy is Hungarian; code/comments are mostly English (some Hungarian
comments exist).

## Commands

```bash
pnpm dev              # next dev
pnpm build            # prisma generate → (prod only) migrate deploy → next build
pnpm typecheck        # next typegen && tsc --noEmit
pnpm lint             # oxlint         (lint:fix to autofix)
pnpm fmt              # oxfmt          (fmt:check for CI parity)

pnpm db:migrate       # prisma migrate dev
pnpm db:generate      # regenerate client into src/generated/prisma
pnpm db:seed          # prisma/seed.ts — creates upcoming TimeSlots
pnpm db:reset         # migrate reset --force + seed
pnpm db:studio        # port 5555
```

CI (`.github/workflows/ci.yml`, runs on every push) = `lint` + `fmt:check` +
`typecheck`. There is **no test suite** — no test runner is installed.

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
  `pnpm db:generate`) — import types/enums from `@/generated/prisma/client`, never
  from `@prisma/client`.

## Environment

`src/env.ts` (`@t3-oss/env-nextjs` + zod) is the only place env vars are read;
never touch `process.env` directly elsewhere. Adding a var means editing both the
schema and `runtimeEnv`. Required: `DATABASE_URL`, `DIRECT_URL`, `RESEND_API_KEY`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SZAMLAZZ_API_KEY`,
`NEXT_PUBLIC_SITE_URL`.

`DATABASE_URL` is used by the runtime app (pooled, via `PrismaPg` adapter in
[src/lib/prisma.ts](src/lib/prisma.ts)); `DIRECT_URL` is used by the Prisma CLI
(`prisma7.config.ts`) for migrations.

## Booking flow (the core of the app)

1. **`/`** ([src/app/page.tsx](src/app/page.tsx), `force-dynamic`) loads future
   `TimeSlot`s via `fetchTimeSlots()`, groups them by Budapest-local day
   (`groupSlotsByDay`), and renders the landing sections. All client-side booking
   selections (package, decor set, day, slot, name, email) live in
   [AppContextProvider.tsx](src/components/AppContextProvider.tsx) — that context
   holds **only primitive user choices**; every price/label is derived, never stored.
2. `createBookingIntent` ([src/server/booking-intent.ts](src/server/booking-intent.ts))
   writes a `BookingIntent` row with an `expiresAt` of `BOOKING_INTENT_TTL_MINUTES`
   and returns its id; the client routes to
   `/foglalas-veglegesitese/[id]`.
3. That page re-validates the intent (not expired, slot still free) and renders
   `BookingSummary`, whose form action is `createCheckoutSession`
   ([src/server/stripe.ts](src/server/stripe.ts)). It persists guest/pet counts +
   note, finds-or-creates the Stripe customer, and redirects to Stripe Checkout
   with `metadata.booking_intent_id`.
4. **`POST /api/webhooks/stripe`** ([route.ts](src/app/api/webhooks/stripe/route.ts))
   handles `checkout.session.completed`: upserts `User` + `ClientProfile`, creates the
   `PhotoShooting` (idempotent — `timeSlotId` is `@unique`) and flips the slot's
   `revealed` to false in a transaction, deletes the `BookingIntent`, sends the Resend
   confirmation, then issues the szamlazz.hu invoice and records `Invoice` + `Payment`.
   Invoice/email failures are logged, not thrown — the shooting stays booked.
5. Stripe redirects to `/success`.

Server-side mutations are Server Actions in [src/server/](src/server/) (`'use server'`
at file top), not route handlers. Errors are returned as `{ error: '<Hungarian string>' }`
objects rather than thrown.

## Money, time, and localization

- **All amounts are integer cents (fillér).** Constants use the `39000_00` literal
  style in [src/lib/constants.ts](src/lib/constants.ts). Render with `formatMoney()`
  from [src/lib/utils.ts](src/lib/utils.ts), which divides by 100.
- **All `Intl` formatters are centralized** in
  [src/lib/formatters.ts](src/lib/formatters.ts) and pinned to
  `timeZone: 'Europe/Budapest'` / `hu-HU`. Timestamps are stored as
  `@db.Timestamptz` and the Postgres session runs with `-c TimeZone=UTC`. Never
  format a date with the machine's local timezone.
- Pricing/package/FAQ/review copy is static data in
  [src/lib/data.ts](src/lib/data.ts) (marked as "replace with a CMS later").

## Styling

Tailwind v4, CSS-first config in [src/app/globals.css](src/app/globals.css) — there
is no `tailwind.config`. The brand palette (`forest`, `cream`, `gold`, `terracotta`,
`sage`…), the three Google fonts (`font-display` Cormorant, `font-sans` Jost,
`font-script` Parisienne) and the `.eyebrow` component class are all declared there
via `@theme inline` / `@layer components`.

shadcn/ui components (style `base-nova`, Base UI primitives, lucide icons) live in
[src/components/ui/](src/components/ui/) and are used almost exclusively by the
admin area; the marketing page is hand-written Tailwind. Dark mode is a `.dark` class
toggled by an inline script in the root layout (localStorage `theme`) — only the admin
area actually uses it.

Gallery images must live in [src/photos/](src/photos/), **not** `public/`, so static
imports supply width/height/blurDataURL to `react-photo-album` and `next/image` — see
the comment block in [src/lib/fetch-photos.ts](src/lib/fetch-photos.ts).

## Coming-soon gate

[src/proxy.ts](src/proxy.ts) (Next 16's middleware equivalent, matcher `/`) rewrites
`/` to `/coming-soon` when `COMING_SOON_ENABLED` is true, unless the request carries
the bypass cookie set by `/?preview=<COMING_SOON_PREVIEW_TOKEN>`. Removal checklist
lives in [COMING_SOON_TEARDOWN.md](COMING_SOON_TEARDOWN.md); delete that file when done.

## Not yet built

`MagicLinkToken` / `Session` models exist in the schema but there is **no auth code** —
`/admin` ([bookings](src/app/admin/bookings/page.tsx),
[settings](src/app/admin/settings/page.tsx)) is an unauthenticated stub with a sidebar
shell and placeholder headings. `StaffProfile`, editor/photographer assignment,
raw/final image URLs, and the Google Calendar entry (TODO in the webhook) are unused.

## Prisma skills

`.claude/skills/` contains vendored Prisma 7 skill docs (CLI, client API, driver
adapters, v6→v7 upgrade). Prefer them over recalled Prisma knowledge — v7 changed the
generator (`prisma-client`, custom output path), made driver adapters mandatory, and
moved config to `prisma7.config.ts`.
