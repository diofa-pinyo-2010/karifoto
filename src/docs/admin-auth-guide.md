# Admin Authentication with Magic Links & Floating Admin Button

Passwordless admin auth for Karifoto's `/admin` area, built on what's already in
this repo: the existing `User`/`StaffProfile`/`Session`/`MagicLinkToken` models,
the `@/lib/prisma` singleton, `sendTemplatedEmail`, Upstash Redis, and the
existing `AppSidebar` layout. This is not a generic tutorial — every snippet
below targets this codebase's actual conventions.

## Table of Contents

- [Overview](#overview)
- [What already exists vs. what's new](#what-already-exists-vs-whats-new)
- [Architecture](#architecture)
- [Implementation](#implementation)
  - [1. Environment Variables](#1-environment-variables)
  - [2. Token Utilities](#2-token-utilities)
  - [3. Session Config](#3-session-config)
  - [4. Session Creation](#4-session-creation)
  - [5. Data Access Layer (DAL)](#5-data-access-layer-dal)
  - [6. proxy.ts — Merge Admin Guard Into the Coming-Soon Gate](#6-proxyts--merge-admin-guard-into-the-coming-soon-gate)
  - [7. Login Page](#7-login-page)
  - [8. Login Form (Client Component)](#8-login-form-client-component)
  - [9. Magic Link + Logout Server Actions](#9-magic-link--logout-server-actions)
  - [10. Magic Link Verification Route](#10-magic-link-verification-route)
  - [11. Protect the Existing Admin Layout](#11-protect-the-existing-admin-layout)
  - [12. Floating Admin Button](#12-floating-admin-button)
  - [13. Admin Verification Email](#13-admin-verification-email)
- [Authentication Flow](#authentication-flow)
- [Security Features](#security-features)

---

## Overview

- Passwordless: magic link to email, no passwords stored.
- Staff-only: only `User`s with a `StaffProfile` row can log in — your own
  account (`nemethricsi@gmail.com`) is already seeded as `SUPERADMIN` in
  [prisma/seed.ts](../../prisma/seed.ts), so there's nothing to bootstrap.
- 30-day sessions, hashed tokens in DB, 15-minute magic links.
- Route protection: `src/proxy.ts` (fast, cookie-existence only) +
  `verifySession()` in the admin layout (real DB check).

## What already exists vs. what's new

| | |
|---|---|
| **Already in the repo — reuse, don't recreate** | `User`, `StaffProfile`, `Session`, `MagicLinkToken` models ([prisma/schema.prisma](../../prisma/schema.prisma)); `@/lib/prisma` singleton; `@/lib/resend/index.ts` + `send-templated-email.ts`; `src/proxy.ts` (coming-soon gate); `src/app/admin/layout.tsx` + `AppSidebar`; `src/env.ts` |
| **New files this guide adds** | `src/lib/token.ts`, `src/lib/session.ts`, `src/lib/auth.ts`, `src/lib/dal.ts`, `src/lib/resend/admin-verification.ts`, `src/server/admin-auth.ts`, `src/app/admin/login/**`, `src/components/FloatingAdminButton.tsx` |

Two repo-specific corrections worth calling out up front, since a generic
version of this guide gets both wrong here:

1. **`src/proxy.ts` already exists** and handles the coming-soon gate on `/`.
   Don't replace it — extend the one exported `proxy()` function and matcher.
2. **Server Actions live in `src/server/`**, not next to the page
   (`CLAUDE.md`: "Server-side mutations are Server Actions in `src/server/`").
   `requestMagicLink` and `logout` go in `src/server/admin-auth.ts`, and errors
   are returned as `{ error: '<Hungarian string>' }`, matching
   [src/server/booking-intent.ts](../../src/server/booking-intent.ts) and
   [src/server/stripe.ts](../../src/server/stripe.ts).

## Architecture

```
src/
├── lib/
│   ├── auth.ts                    # new: createSession()
│   ├── dal.ts                     # new: getSession(), verifySession()
│   ├── session.ts                 # new: cookie name/options, TTL constants
│   ├── token.ts                   # new: token generation & hashing
│   ├── prisma.ts                  # existing — reused as-is
│   ├── upstash.ts                 # existing — reused for rate limiting
│   └── resend/
│       ├── index.ts               # existing — reused as-is
│       ├── send-templated-email.ts # existing — reused as-is
│       └── admin-verification.ts  # new: sendAdminVerificationEmail()
├── proxy.ts                       # existing — EXTENDED, not replaced
├── server/
│   └── admin-auth.ts              # new: requestMagicLink(), logout() ('use server')
├── components/
│   └── FloatingAdminButton.tsx    # new
└── app/
    ├── page.tsx                   # existing — renders FloatingAdminButton when session exists
    └── admin/
        ├── layout.tsx             # existing — add verifySession() + logout button
        ├── page.tsx                # existing — already redirects to /admin/bookings
        └── login/
            ├── page.tsx            # new
            ├── login-form.tsx      # new (client)
            └── verify/
                └── route.ts        # new (GET handler)
```

`StaffProfile.role` (`SUPERADMIN` / `ADMIN`) and `isPhotographer`/`isEditor`
already exist in the schema but aren't used for authorization here — any row
with a `StaffProfile` can log in to `/admin`. Add role checks later if you
need to restrict specific admin pages.

---

## Implementation

### 1. Environment Variables

`src/env.ts` already exists (`@t3-oss/env-core` + zod) — extend it rather than
create a new schema. Add nothing at all, actually: this feature needs no new
env vars — `RESEND_API_KEY`, `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, and
`UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are already required and
already validated.

### 2. Token Utilities

```ts
// src/lib/token.ts
import { createHash, randomBytes } from 'node:crypto';

export function generateToken() {
  const raw = randomBytes(32).toString('base64url');
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string) {
  return createHash('sha256').update(raw).digest('hex');
}
```

`raw` goes in the email link / cookie; `hash` is what's stored in
`MagicLinkToken.tokenHash` / `Session.tokenHash`. A DB leak never exposes a
usable token.

### 3. Session Config

TTLs live next to the code that uses them, in seconds with an inline comment —
matching [src/lib/idempotency.ts](../../src/lib/idempotency.ts)'s style, not a
central constants file:

```ts
// src/lib/session.ts
export const SESSION_COOKIE_NAME = 'admin_session';
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
export const MAGIC_LINK_TTL_SECONDS = 15 * 60; // 15 minutes

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    expires: expiresAt,
  };
}
```

### 4. Session Creation

Reuse the existing `prisma` singleton — never instantiate a new client:

```ts
// src/lib/auth.ts
import { prisma } from '@/lib/prisma';
import { SESSION_TTL_SECONDS } from '@/lib/session';
import { generateToken } from '@/lib/token';

export async function createSession(userId: string) {
  const { raw, hash } = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  await prisma.session.create({
    data: { userId, tokenHash: hash, expiresAt },
  });

  return { raw, expiresAt };
}
```

### 5. Data Access Layer (DAL)

The relation on `Session`/`MagicLinkToken` back to `User` is named `owner`
(see `prisma/schema.prisma`), not `user` — get this wrong and the query
silently 500s at runtime, not at typecheck.

```ts
// src/lib/dal.ts
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE_NAME } from '@/lib/session';
import { hashToken } from '@/lib/token';

// Returns session data or null — use on public pages.
export const getSession = cache(async () => {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!rawToken) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { owner: { include: { staffProfile: true } } },
  });

  if (
    !session ||
    session.expiresAt <= new Date() ||
    !session.owner.staffProfile
  ) {
    return null;
  }

  return { user: session.owner, staffProfile: session.owner.staffProfile };
});

// Returns session data or redirects to login — use on protected pages.
export const verifySession = cache(async () => {
  const session = await getSession();

  if (!session) {
    redirect('/admin/login');
  }

  return session;
});
```

`cache()` dedupes calls within one request. `getSession()` checks token
validity *and* `staffProfile` existence, so a customer `User` (created by the
Stripe webhook on checkout) can never pass this check even with a forged
cookie shaped right.

### 6. proxy.ts — Merge Admin Guard Into the Coming-Soon Gate

`src/proxy.ts` already exists and rewrites `/` to `/coming-soon`. There is
exactly one `proxy` export for the whole app — extend it, don't replace it,
and give the matcher both paths:

```ts
// src/proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { env } from '@/env';
import { SESSION_COOKIE_NAME } from '@/lib/session';

const BYPASS_COOKIE = 'coming-soon-bypass';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    const isLoginRoute =
      pathname === '/admin/login' || pathname.startsWith('/admin/login/');
    const hasSessionCookie = request.cookies.has(SESSION_COOKIE_NAME);

    if (!isLoginRoute && !hasSessionCookie) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    return NextResponse.next();
  }

  if (!env.COMING_SOON_ENABLED || !env.COMING_SOON_PREVIEW_TOKEN) {
    return NextResponse.next();
  }

  const previewToken = request.nextUrl.searchParams.get('preview');
  if (previewToken === env.COMING_SOON_PREVIEW_TOKEN) {
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.set(BYPASS_COOKIE, env.COMING_SOON_PREVIEW_TOKEN, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }

  if (
    request.cookies.get(BYPASS_COOKIE)?.value === env.COMING_SOON_PREVIEW_TOKEN
  ) {
    return NextResponse.next();
  }

  return NextResponse.rewrite(new URL('/coming-soon', request.url));
}

export const config = {
  matcher: ['/', '/admin/:path*'],
};
```

This is the fast, edge-compatible check (cookie *existence* only). Real
validation happens in `verifySession()` server-side (step 11) — the cookie
could be stale or forged, and only the DB check catches that.

### 7. Login Page

```tsx
// src/app/admin/login/page.tsx
import { redirect } from 'next/navigation';

import { getSession } from '@/lib/dal';

import { LoginForm } from '@/app/admin/login/login-form';

export default async function AdminLoginPage() {
  const session = await getSession();

  if (session) {
    redirect('/admin/bookings');
  }

  return <LoginForm />;
}
```

### 8. Login Form (Client Component)

No relative imports (`no-restricted-imports` bans `./`/`../` in this repo) —
`@/app/admin/login/actions` even for a same-directory file. Copy is Hungarian,
matching every other user-facing string in this app.

```tsx
// src/app/admin/login/login-form.tsx
'use client';

import { useActionState } from 'react';

import { requestMagicLink } from '@/server/admin-auth';

export function LoginForm() {
  const [state, action, pending] = useActionState(requestMagicLink, undefined);

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 bg-forest px-4 font-sans text-cream">
      <div>
        <h1 className="font-display text-2xl">Admin belépés</h1>
        <p className="mt-1 text-sm text-cream-muted">
          Add meg az e-mail címed, és küldünk egy belépési linket.
        </p>
      </div>
      <form action={action} className="flex flex-col gap-3">
        <label htmlFor="email" className="text-sm font-medium">
          E-mail cím
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="admin@example.com"
          className="rounded-md border border-sage/40 bg-cream px-3 py-2 text-forest"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-terracotta px-3 py-2 font-medium text-[#FFF4E6] transition-colors hover:bg-terracotta-hover disabled:opacity-50"
        >
          {pending ? 'Küldés...' : 'Belépési link küldése'}
        </button>
      </form>
      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state?.message && <p className="text-sm text-sage">{state.message}</p>}
    </div>
  );
}
```

### 9. Magic Link + Logout Server Actions

Both live in `src/server/`, `'use server'` at the top, errors as
`{ error: '<Hungarian>' }` — same shape as `createBookingIntent` and
`createCheckoutSession`. Rate limiting uses the existing Upstash Redis client
(`@/lib/upstash`, already used by `src/lib/idempotency.ts`) with an atomic
`nx`/`ex` `SET` — a DB `findFirst` + `create` pair (the generic version of
this pattern) has a race: two submits within the same tick both pass the
check before either row exists. `redis.set(..., { nx: true })` closes that.

```ts
// src/server/admin-auth.ts
'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import * as z from 'zod';

import { prisma } from '@/lib/prisma';
import { sendAdminVerificationEmail } from '@/lib/resend/admin-verification';
import { SESSION_COOKIE_NAME } from '@/lib/session';
import { createSession } from '@/lib/auth';
import { MAGIC_LINK_TTL_SECONDS } from '@/lib/session';
import { generateToken, hashToken } from '@/lib/token';
import { redis } from '@/lib/upstash';

const EmailSchema = z.object({ email: z.email() });

export type LoginFormState = { error?: string; message?: string } | undefined;

const GENERIC_MESSAGE =
  'Ha ez az e-mail cím regisztrálva van, elküldtük rá a belépési linket.';
const MAGIC_LINK_RATE_LIMIT_SECONDS = 60;

const magicLinkRateLimitKey = (userId: string) => `magic_link_rl:${userId}`;

export async function requestMagicLink(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = EmailSchema.safeParse({ email: formData.get('email') });

  if (!parsed.success) {
    return { error: 'Adj meg egy érvényes e-mail címet.' };
  }

  const email = parsed.data.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email },
    include: { staffProfile: true },
  });

  if (user?.staffProfile != null) {
    const allowed = await redis.set(magicLinkRateLimitKey(user.id), '1', {
      nx: true,
      ex: MAGIC_LINK_RATE_LIMIT_SECONDS,
    });

    if (allowed !== null) {
      const { raw, hash } = generateToken();
      const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_SECONDS * 1000);

      await prisma.magicLinkToken.create({
        data: { userId: user.id, tokenHash: hash, expiresAt },
      });

      const headersList = await headers();
      const host = headersList.get('host');
      const proto = headersList.get('x-forwarded-proto') ?? 'https';
      const verifyUrl = `${proto}://${host}/admin/login/verify?token=${raw}`;

      await sendAdminVerificationEmail({
        to: email,
        name: user.name,
        verifyUrl,
      });
    }
  }

  // Same message either way — no user enumeration.
  return { message: GENERIC_MESSAGE };
}

export async function logout() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (rawToken) {
    await prisma.session.deleteMany({
      where: { tokenHash: hashToken(rawToken) },
    });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect('/admin/login');
}
```

Note `user.name`, not `user.firstName` — the `User` model has no `firstName`
field in this schema.

### 10. Magic Link Verification Route

```ts
// src/app/admin/login/verify/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { createSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '@/lib/session';
import { hashToken } from '@/lib/token';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const invalidUrl = new URL('/admin/login?error=invalid', request.url);

  if (!token) {
    return NextResponse.redirect(invalidUrl);
  }

  const tokenHash = hashToken(token);

  const magicLinkToken = await prisma.magicLinkToken.findUnique({
    where: { tokenHash },
  });

  if (
    !magicLinkToken ||
    magicLinkToken.usedAt ||
    magicLinkToken.expiresAt <= new Date()
  ) {
    return NextResponse.redirect(invalidUrl);
  }

  // Atomic claim — prevents a replayed link from creating two sessions.
  const { count } = await prisma.magicLinkToken.updateMany({
    where: { id: magicLinkToken.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  if (count !== 1) {
    return NextResponse.redirect(invalidUrl);
  }

  const { raw, expiresAt } = await createSession(magicLinkToken.userId);

  const response = NextResponse.redirect(new URL('/admin', request.url));
  response.cookies.set(SESSION_COOKIE_NAME, raw, sessionCookieOptions(expiresAt));

  return response;
}
```

`/admin` already redirects to `/admin/bookings` ([src/app/admin/page.tsx](../../src/app/admin/page.tsx)) — no change needed there.

### 11. Protect the Existing Admin Layout

Don't build a parallel dashboard shell — this repo already has one
([src/app/admin/layout.tsx](../../src/app/admin/layout.tsx) +
[AppSidebar](../../src/components/admin/app-sidebar.tsx)). Add the session
check and a logout button to it:

```tsx
// src/app/admin/layout.tsx
import { AppSidebar } from '@/components/admin/app-sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { verifySession } from '@/lib/dal';
import { logout } from '@/server/admin-auth';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  const { user } = await verifySession();

  return (
    <SidebarProvider>
      <AppSidebar userName={user.name} onLogout={logout} />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center justify-between border-b px-3">
          <SidebarTrigger />
          <ThemeToggle />
        </header>
        <div className="flex flex-1 flex-col p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

Wire `userName`/`onLogout` into `AppSidebar`'s footer (a `<form action={onLogout}>` with a submit button), same shape as its existing nav items. Note `/admin/login` itself is *outside* this layout (it's a sibling route under `src/app/admin/login/`, not nested under a layout that calls `verifySession()`) — otherwise the login page would redirect-loop against itself.

### 12. Floating Admin Button

A server component matching the site's actual palette (`forest`/`terracotta`), not generic gray:

```tsx
// src/components/FloatingAdminButton.tsx
import { LayoutDashboard } from 'lucide-react';
import Link from 'next/link';

export function FloatingAdminButton() {
  return (
    <Link
      href="/admin/bookings"
      className="fixed right-5 bottom-5 z-20 inline-flex items-center gap-2 rounded-full bg-terracotta px-5 py-3.5 font-medium text-[#FFF4E6] shadow-xl transition hover:bg-terracotta-hover"
    >
      <LayoutDashboard size={18} />
      Admin
    </Link>
  );
}
```

Render it from `src/app/page.tsx`, which is already `force-dynamic` and reads cookies elsewhere — no extra cost to also call `getSession()`:

```tsx
// src/app/page.tsx (add to the existing file)
import { getSession } from '@/lib/dal';
import { FloatingAdminButton } from '@/components/FloatingAdminButton';

export default async function Home() {
  const session = await getSession();
  const availableTimeSlots = await fetchTimeSlots();
  const groups = groupSlotsByDay(availableTimeSlots);

  return (
    <BookingSelectionProvider>
      <Header />
      <main className="bg-forest font-sans text-cream">
        {/* ...existing sections... */}
      </main>
      <Footer />
      {session && <FloatingAdminButton />}
    </BookingSelectionProvider>
  );
}
```

### 13. Admin Verification Email

`resend.emails.send({ template: { id, variables } })` is a real Resend API
(verified against current docs) and `sendTemplatedEmail` already implements
it in [src/lib/resend/send-templated-email.ts](../../src/lib/resend/send-templated-email.ts) — reuse it, just add the admin-specific wrapper:

```ts
// src/lib/resend/admin-verification.ts
import { sendTemplatedEmail } from '@/lib/resend/send-templated-email';

const ADMIN_LOGIN_TEMPLATE_ID = 'your-resend-template-id';

type SendAdminVerificationEmailParams = {
  to: string;
  name: string;
  verifyUrl: string;
};

export function sendAdminVerificationEmail({
  to,
  name,
  verifyUrl,
}: SendAdminVerificationEmailParams) {
  return sendTemplatedEmail({
    to,
    templateId: ADMIN_LOGIN_TEMPLATE_ID,
    variables: { NAME: name, VERIFY_URL: verifyUrl },
  });
}
```

Create the actual template in the Resend dashboard and drop its real ID in.

---

## Authentication Flow

```
/admin/* request
        |
        v
proxy.ts: has admin_session cookie? --no--> redirect /admin/login
        |
       yes
        v
/admin/login: submit email -> requestMagicLink() (src/server/admin-auth.ts)
        |
        v
Lookup User + staffProfile; Redis nx/ex rate limit (1 / 60s)
        |
        v
Store MagicLinkToken.tokenHash (15min TTL) -> email link via sendAdminVerificationEmail
        |
        v
GET /admin/login/verify?token=... -> hash, find, check unused & unexpired
        |
        v
Atomic updateMany usedAt (prevents replay) -> createSession() (30 day TTL)
        |
        v
Set httpOnly admin_session cookie -> redirect /admin -> /admin/bookings
        |
        v
admin/layout.tsx calls verifySession() -> real DB check, staffProfile confirmed
```

## Security Features

| Feature | Implementation |
|---|---|
| No passwords | Magic links only |
| Hashed tokens | SHA-256; raw token only ever in email link / cookie |
| Rate limiting | Redis `SET NX EX` — atomic, no TOCTOU window |
| Token expiration | 15 min magic links, 30 day sessions |
| One-time tokens | Atomic `updateMany` claim prevents replay |
| httpOnly + secure cookies | XSS-resistant, `sameSite: lax` |
| No user enumeration | Identical response for known/unknown emails |
| Staff-only access | Requires `staffProfile` relation, checked in `getSession()` |
| Dual protection | `proxy.ts` (edge, cookie existence) + `verifySession()` (server, real DB check) |
| Request dedup | `cache()` around `getSession()`/`verifySession()` |
