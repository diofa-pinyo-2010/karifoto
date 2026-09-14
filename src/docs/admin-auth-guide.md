# Admin Authentication with Magic Links & Floating Admin Button

Passwordless admin auth for Karifoto's `/admin` area, built on what's already in
this repo: the existing `User`/`StaffProfile`/`Session`/`MagicLinkToken` models,
the `@/lib/prisma` singleton, `sendTemplatedEmail`, Upstash Redis, and the
existing `AppSidebar` layout. This is not a generic tutorial — every snippet
below targets this codebase's actual conventions.

Two phases: **Phase 1** (steps 1–14 below) is `/admin` — staff auth plus
`SUPERADMIN`/`EDITOR` authorization — and is buildable now. **Phase 2** (its
own section at the end) is the client-facing `/client/*` portal — captured
here as an agreed design, not yet built, so Phase 1 doesn't paint us into a
corner (e.g. cookie naming, session table shape).

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
  - [14. Role-Based Authorization (SUPERADMIN vs EDITOR)](#14-role-based-authorization-superadmin-vs-editor)
- [Authentication Flow](#authentication-flow)
- [Security Features](#security-features)
- [Phase 2 (later): Client Portal (`/client/*`)](#phase-2-later-client-portal-client)

---

## Overview

- Passwordless: magic link to email, no passwords stored.
- Staff-only: only `User`s with a `StaffProfile` row can log in — your own
  account (`nemethricsi@gmail.com`) is already seeded as `SUPERADMIN` in
  [prisma/seed.ts](../../prisma/seed.ts), so there's nothing to bootstrap.
- Two roles, already migrated: `SUPERADMIN` (full access) and `EDITOR`
  (photographers/editors — limited, mostly read-only access), see
  [step 14](#14-role-based-authorization-superadmin-vs-editor).
- 30-day sessions, hashed tokens in DB, 15-minute magic links.
- Route protection: `src/proxy.ts` (fast, cookie-existence only) +
  `verifySession()` in the admin layout (real DB check) +
  per-page role checks for `SUPERADMIN`-only sections.

## What already exists vs. what's new

|                                                 |                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Already in the repo — reuse, don't recreate** | `User`, `StaffProfile`, `Session`, `MagicLinkToken` models ([prisma/schema.prisma](../../prisma/schema.prisma)), including the migrated `StaffProfileRole` enum (`SUPERADMIN` \| `EDITOR`, default `EDITOR`); `@/lib/prisma` singleton; `@/lib/resend/index.ts` + `send-templated-email.ts`; `src/proxy.ts` (coming-soon gate); `src/app/admin/layout.tsx` + `AppSidebar`; `src/env.ts` |
| **New files this guide adds**                   | `src/lib/token.ts`, `src/lib/session.ts`, `src/lib/auth.ts`, `src/lib/dal.ts`, `src/lib/admin-nav.ts`, `src/lib/resend/admin-verification.ts`, `src/server/admin-auth.ts`, `src/app/admin/login/**`, `src/components/FloatingAdminButton.tsx`                                                                                                                                           |

Three repo-specific corrections worth calling out up front, since a generic
version of this guide gets all three wrong here:

1. **`src/proxy.ts` already exists** and handles the coming-soon gate on `/`.
   Don't replace it — extend the one exported `proxy()` function and matcher.
2. **Server Actions live in `src/server/`**, not next to the page
   (`CLAUDE.md`: "Server-side mutations are Server Actions in `src/server/`").
   `requestMagicLink` and `logout` go in `src/server/admin-auth.ts`, and errors
   are returned as `{ error: '<Hungarian string>' }`, matching
   [src/server/booking-intent.ts](../../src/server/booking-intent.ts) and
   [src/server/stripe.ts](../../src/server/stripe.ts).
3. **`isPhotographer`/`isEditor` are not authorization flags.** They only
   decide who's eligible to be assigned as a `PhotoShooting`'s photographer or
   editor. Authorization is `StaffProfile.role` alone — see
   [step 14](#14-role-based-authorization-superadmin-vs-editor).

## Architecture

```
src/
├── lib/
│   ├── auth.ts                    # new: createSession()
│   ├── dal.ts                     # new: getSession(), verifySession() (accepts allowed roles)
│   ├── admin-nav.ts               # new: ADMIN_NAV_ITEMS — single source of truth for nav + route roles
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

Any row with a `StaffProfile` — either role — can _log in_ to `/admin`; steps
1–13 (auth) don't distinguish `SUPERADMIN` from `EDITOR` at all. What each
role can then _see and do_ inside `/admin` is a separate, later concern,
covered in [step 14](#14-role-based-authorization-superadmin-vs-editor).

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
validity _and_ `staffProfile` existence, so a customer `User` (created by the
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

This is the fast, edge-compatible check (cookie _existence_ only). Real
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
  response.cookies.set(
    SESSION_COOKIE_NAME,
    raw,
    sessionCookieOptions(expiresAt),
  );

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
  const { user, staffProfile } = await verifySession();

  return (
    <SidebarProvider>
      <AppSidebar
        userName={user.name}
        role={staffProfile.role}
        onLogout={logout}
      />
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

Wire `userName`/`onLogout` into `AppSidebar`'s footer (a `<form action={onLogout}>` with a submit button), same shape as its existing nav items. `role` is new — see [step 14](#14-role-based-authorization-superadmin-vs-editor) for what `AppSidebar` does with it. Note `/admin/login` itself is _outside_ this layout (it's a sibling route under `src/app/admin/login/`, not nested under a layout that calls `verifySession()`) — otherwise the login page would redirect-loop against itself.

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

### 14. Role-Based Authorization (SUPERADMIN vs EDITOR)

`StaffProfile.role` is already migrated to `SUPERADMIN` | `EDITOR` (default
`EDITOR`) in `prisma/schema.prisma`. `isPhotographer`/`isEditor` stay out of
this entirely — they only gate who can be assigned to a `PhotoShooting`, not
what they can see in `/admin`.

Current scope, decided for this repo (revisit if requirements grow):

- **Page-level only.** A nav item/route is either visible+reachable for a
  role or it isn't. No row-level filtering (an `EDITOR` sees the same
  `PhotoShooting` rows a `SUPERADMIN` does) and no field-level PII hiding —
  both roles see identical data on shared pages, for now.
- **Unauthorized direct navigation** (an `EDITOR` hitting a `SUPERADMIN`-only
  URL) redirects to `/admin/bookings`, the same target `verifySession()`
  already uses as the "safe default" page.
- **One config drives both** the sidebar nav and the route guard, so a page
  can't be reachable without appearing in the nav, or vice versa.

#### Single source of truth: `src/lib/admin-nav.ts`

```ts
// src/lib/admin-nav.ts
import { CalendarDays, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { StaffProfileRole } from '@/generated/prisma/enums';

export type AdminNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  allowedRoles: readonly StaffProfileRole[];
};

const ALL_STAFF = [
  StaffProfileRole.SUPERADMIN,
  StaffProfileRole.EDITOR,
] as const;

export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  {
    title: 'Foglalások',
    href: '/admin/bookings',
    icon: CalendarDays,
    allowedRoles: ALL_STAFF,
  },
  {
    title: 'Beállítások',
    href: '/admin/settings',
    icon: Settings,
    allowedRoles: ALL_STAFF,
  },
  // Future SUPERADMIN-only example:
  // { title: 'Finance', href: '/admin/finance', icon: Wallet, allowedRoles: [StaffProfileRole.SUPERADMIN] },
];
```

Adding a restricted page later is a one-line change here, not a new
permissions concept.

#### `AppSidebar` filters by role

`AppSidebar` is a client component, so the role has to come down as a prop
from the (server) layout — it can't call `verifySession()` itself.

```tsx
// src/components/admin/app-sidebar.tsx
'use client';

import { usePathname } from 'next/navigation';

import { StaffProfileRole } from '@/generated/prisma/enums';
import { ADMIN_NAV_ITEMS } from '@/lib/admin-nav';
// ...existing Sidebar* imports...

type AppSidebarProps = {
  role: StaffProfileRole;
  // ...existing userName/onLogout props...
};

export function AppSidebar({ role }: AppSidebarProps) {
  const pathname = usePathname();
  const visibleItems = ADMIN_NAV_ITEMS.filter((item) =>
    item.allowedRoles.includes(role),
  );

  return (
    // ...existing Sidebar markup, but map over `visibleItems` instead of the
    // old inline `items` array...
  );
}
```

#### Guarding the route itself: `requireNavAccess()` in the DAL

Hiding the nav item is cosmetic — a role-gated page must still refuse the
`EDITOR` who navigates there directly. Add this to `src/lib/dal.ts` alongside
`getSession()`/`verifySession()` from step 5:

```ts
// src/lib/dal.ts (addition)
import { ADMIN_NAV_ITEMS } from '@/lib/admin-nav';

// Use in a specific /admin/<page>.tsx that needs restricting beyond
// "any staff member." Looks up its own required roles from the same
// ADMIN_NAV_ITEMS list AppSidebar renders from — one list, two consumers.
export async function requireNavAccess(href: string) {
  const session = await verifySession();

  const navItem = ADMIN_NAV_ITEMS.find((item) => item.href === href);
  if (navItem && !navItem.allowedRoles.includes(session.staffProfile.role)) {
    redirect('/admin/bookings');
  }

  return session;
}
```

Usage in a future restricted page:

```tsx
// src/app/admin/finance/page.tsx (future)
import { requireNavAccess } from '@/lib/dal';

export default async function FinancePage() {
  await requireNavAccess('/admin/finance');
  // ...
}
```

`/admin/bookings` and `/admin/settings` don't need this call today — both
roles are allowed, so plain `verifySession()` (already required for every
admin page, step 11) is sufficient. Add the `requireNavAccess()` call the
day a page's `allowedRoles` stops being `ALL_STAFF`.

#### Readonly content within a shared page (forward-looking)

No concrete page needs this yet (settings and bookings are simple lists for
both roles today) — this is the pattern to reach for when one shows up, not
something to build preemptively:

```tsx
const { staffProfile } = await verifySession();
const canEdit = staffProfile.role === StaffProfileRole.SUPERADMIN;

return canEdit ? (
  <EditableField value={value} />
) : (
  <StaticField value={value} />
);
```

The UI branch is cosmetic. **Whatever Server Action performs the actual
mutation must independently re-check the role** — an `EDITOR` can call a
Server Action directly regardless of what the page renders for them:

```ts
// inside the relevant 'use server' file
const { staffProfile } = await verifySession();
if (staffProfile.role !== StaffProfileRole.SUPERADMIN) {
  return { error: 'Nincs jogosultságod ehhez a művelethez.' };
}
```

Don't build a generic `<ReadOnlyField>`/permissions-matrix abstraction until
a second real page needs this — one page's worth of `canEdit` branching
doesn't earn it yet.

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

| Feature                   | Implementation                                                                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No passwords              | Magic links only                                                                                                                                                                |
| Hashed tokens             | SHA-256; raw token only ever in email link / cookie                                                                                                                             |
| Rate limiting             | Redis `SET NX EX` — atomic, no TOCTOU window                                                                                                                                    |
| Token expiration          | 15 min magic links, 30 day sessions                                                                                                                                             |
| One-time tokens           | Atomic `updateMany` claim prevents replay                                                                                                                                       |
| httpOnly + secure cookies | XSS-resistant, `sameSite: lax`                                                                                                                                                  |
| No user enumeration       | Identical response for known/unknown emails                                                                                                                                     |
| Staff-only access         | Requires `staffProfile` relation, checked in `getSession()`                                                                                                                     |
| Dual protection           | `proxy.ts` (edge, cookie existence) + `verifySession()` (server, real DB check)                                                                                                 |
| Request dedup             | `cache()` around `getSession()`/`verifySession()`                                                                                                                               |
| Role-based authorization  | `StaffProfile.role` (`SUPERADMIN`/`EDITOR`) gates page access via `requireNavAccess()`; UI hiding is never the only check — mutating Server Actions re-check role independently |

---

## Phase 2 (later): Client Portal (`/client/*`)

Not being built now. This section records the design agreed on so Phase 1
doesn't make choices (cookie naming, session table shape) that would have to
be undone later — it's not a step-by-step guide like the sections above, and
some details are explicitly left open.

### Two new route families, one new cookie

- **`/client/{clientProfileId}/`** — public. Deliberately protected only by
  the `clientProfileId` UUID being unguessable, not by any session check.
  Clients are meant to share this ("check our photos!"), so it shows the
  gallery / eventual memorial page and nothing sensitive. No cookie required,
  ever, for this route.
- **`/client/{clientProfileId}/shooting/{photoShootingId}/details`** —
  gated: payments, invoices. Requires `client_session` **or** `admin_session`
  — no role restriction beyond being staff; `EDITOR` sees this too, same as
  `SUPERADMIN` (unlike `/admin/finance`, which is `SUPERADMIN`-only).
- **The "I selected the images, I'm ready" action** — gated, `client_session`
  **only**, not reachable via `admin_session` even though staff can view
  `/details`. This maps directly onto the existing `PhotoShootingStatus`
  enum: the action is a `USER_SELECTION → FINAL_PHOTOS_UPLOAD` transition,
  no new model needed.

### The rule that makes the public page safe to share

The public gallery URL and the link that grants `client_session` must never
be the same value, and visiting the gallery must never silently issue the
cookie. If it did, sharing the gallery link — the entire point of that page —
would also hand out access to that client's payments, invoices, and the
selection-confirm action to anyone the client shares it with.

So `clientProfileId` in the URL is not a credential — it only ever unlocks
the public gallery. The `client_session` cookie is granted by a **separate**,
privately-emailed link carrying its own token:
`/client/{clientProfileId}/?token=<raw>` (or a dedicated verification route,
mirroring [step 10](#10-magic-link-verification-route): hash the token, look
it up, set the cookie once. Sent automatically once, right after booking
confirmation — not requested via a login form the way admin's magic link is.

### One cookie for both staff roles, a second one for clients — not three

Per [step 14](#14-role-based-authorization-superadmin-vs-editor)'s reasoning:
a cookie _name_ can't itself carry authorization — the token inside it is
what's looked up against the `Session` table regardless of what the cookie
is called — so staff stays on a single `admin_session` for both
`SUPERADMIN` and `EDITOR`. A separate `editor_session` would just create a
second, staleness-prone place role lives (promote someone and their old
cookie name would lie about their access until they re-login).

Clients get a genuinely different cookie, `client_session`, because they're
a structurally different relation (`owner.clientProfile`, not
`owner.staffProfile`), have no role concept, and need a much longer-lived
session than a 30-day admin one.

Reuses the same `Session` table (already keyed to `User`, which already
carries an optional `clientProfile` alongside `staffProfile`) — a
`getClientSession()` alongside `getSession()` in the DAL, discriminated by
`owner.clientProfile != null` the same way admin is discriminated by
`owner.staffProfile != null`.

### One `User`, two profiles — no conflict

A `SUPERADMIN`/`EDITOR` who books a shooting under their own email (e.g. for
testing) ends up with both a `StaffProfile` and a `ClientProfile` on the same
`User` row — the Stripe webhook upserts `User` by email, so it finds the
existing staff `User` and just adds a `ClientProfile`, rather than creating a
second user. That person can then hold an `admin_session` and a
`client_session` at the same time with no conflict:

- `Session` has no uniqueness constraint on `userId`, so the same `User` can
  own two independent `Session` rows (one per cookie) simultaneously.
- Different cookie names (`admin_session` / `client_session`) mean the
  browser stores both without either overwriting the other.
- `getSession()` only ever looks at `owner.staffProfile`; the Phase 2
  `getClientSession()` only ever looks at `owner.clientProfile`. Neither
  check leaks into the other, so holding both profiles never grants more
  than either session type would on its own.

### Decisions

- **`EDITOR` sees `/details` too.** The OR-gate is "any staff," full stop —
  unlike `/admin/finance`, there's no `SUPERADMIN`-only carve-out for a
  client's payments/invoices. Staff supporting a client by phone/email needs
  this regardless of role.
- **The bootstrap token is reusable, not single-use.** It's not a
  `MagicLinkToken`-shaped one-time claim — no `usedAt`, long expiry (e.g. a
  year), and clicking the same emailed link again just re-sets the cookie.
  This was chosen over single-use deliberately: single-use means losing the
  cookie (cleared browser, new device) permanently locks the client out with
  no self-serve way back in, and building a "resend my portal link" recovery
  flow isn't worth doing for v1. The accepted tradeoff: whoever holds that
  email holds access — if the client forwards it, they forward access too.
  Mitigate with a line in the email itself (something like "this link is
  personal to you — don't forward it"), not with product logic.
- **Row-scoping is mandatory, not optional.** A valid `client_session`
  proves _a_ client is logged in, not that they're _this_ client — every
  `/client/*` data fetch must check `owner.clientProfile.id` against the
  `clientProfileId` in the URL (and `photoShootingId` against that same
  client), or one client could swap the URL segment and read another
  client's payments. `requireNavAccess()` doesn't need this today (admin
  pages aren't per-resource), but this is the one place Phase 2 needs a
  check Phase 1 doesn't.

This section stays prose-and-decisions, not code, until Phase 2 is actually
scheduled.
