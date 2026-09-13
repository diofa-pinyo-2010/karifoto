# Admin Authentication with Magic Links & Floating Admin Button

A passwordless admin authentication system using magic links, built with Next.js App Router, Prisma, and Resend.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Implementation](#implementation)
  - [1. Environment Variables](#1-environment-variables)
  - [2. Token Utilities](#2-token-utilities)
  - [3. Session Configuration](#3-session-configuration)
  - [4. Session Creation](#4-session-creation)
  - [5. Data Access Layer (DAL)](#5-data-access-layer-dal)
  - [6. Middleware (Route Protection)](#6-middleware-route-protection)
  - [7. Login Page](#7-login-page)
  - [8. Login Form (Client Component)](#8-login-form-client-component)
  - [9. Magic Link Server Action](#9-magic-link-server-action)
  - [10. Magic Link Verification Route](#10-magic-link-verification-route)
  - [11. Logout Server Action](#11-logout-server-action)
  - [12. Admin Dashboard Layout (Protected)](#12-admin-dashboard-layout-protected)
  - [13. Admin Root Redirect](#13-admin-root-redirect)
  - [14. Floating Admin Button](#14-floating-admin-button)
  - [15. Rendering the Button on Public Pages](#15-rendering-the-button-on-public-pages)
  - [16. Email Sending (Resend)](#16-email-sending-resend)
- [Authentication Flow](#authentication-flow)
- [Security Features](#security-features)
- [Dependencies](#dependencies)

---

## Overview

- **Passwordless auth** via magic links sent to admin email addresses
- **Staff-only access** - only users with a `staffProfile` can log in
- **Floating admin button** - appears on public pages when an admin is logged in
- **30-day sessions** stored in DB with hashed tokens
- **Middleware + server-side checks** for route protection

## Architecture

```
src/
├── lib/
│   ├── auth.ts              # createSession()
│   ├── dal.ts               # getSession(), verifySession()
│   ├── session.ts           # Cookie config, TTLs
│   ├── token.ts             # Token generation & hashing
│   ├── prisma.ts            # Prisma client
│   └── resend/
│       ├── index.ts         # Resend client
│       ├── admin-verification.ts  # Send magic link email
│       ├── send-templated-email.ts
│       └── email-templates.ts
├── proxy.ts                 # Middleware for /admin/* routes
├── components/
│   └── FloatingAdminButton.tsx
└── app/
    ├── page.tsx             # Public page (renders FloatingAdminButton)
    └── admin/
        ├── page.tsx         # Redirects to dashboard
        ├── actions.ts       # logout()
        ├── login/
        │   ├── page.tsx     # Login page
        │   ├── login-form.tsx  # Client form component
        │   ├── actions.ts   # requestMagicLink()
        │   └── verify/
        │       └── route.ts # GET handler for magic link verification
        └── dashboard/
            └── layout.tsx   # Protected layout with sidebar
```

## Database Schema

You need these three models (Prisma schema):

```prisma
model User {
  id           String         @id @default(cuid())
  email        String         @unique
  firstName    String
  staffProfile StaffProfile?
  sessions     Session[]
  magicLinks   MagicLinkToken[]
}

model StaffProfile {
  id     String @id @default(cuid())
  user   User   @relation(fields: [userId], references: [id])
  userId String @unique
}

model Session {
  id        String   @id @default(cuid())
  tokenHash String   @unique
  expiresAt DateTime
  user      User     @relation(fields: [userId], references: [id])
  userId    String
  createdAt DateTime @default(now())
}

model MagicLinkToken {
  id        String    @id @default(cuid())
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  user      User      @relation(fields: [userId], references: [id])
  userId    String
  createdAt DateTime  @default(now())
}
```

Key: Only users with a `StaffProfile` record are considered admins.

---

## Implementation

### 1. Environment Variables

```ts
// src/env.ts
import { createEnv } from '@t3-oss/env-core';
import * as z from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    RESEND_API_KEY: z.string().min(1),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
```

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

- `raw` token is sent to the user (in email / cookie)
- `hash` is stored in the database
- SHA-256 ensures DB compromise doesn't leak usable tokens

### 3. Session Configuration

```ts
// src/lib/session.ts
export const SESSION_COOKIE_NAME = 'admin_session';
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
export const MAGIC_LINK_TTL_MS = 1000 * 60 * 15; // 15 minutes

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

```ts
// src/lib/auth.ts
import { prisma } from '@/lib/prisma';
import { SESSION_TTL_MS } from '@/lib/session';
import { generateToken } from '@/lib/token';

export async function createSession(userId: string) {
  const { raw, hash } = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: { userId, tokenHash: hash, expiresAt },
  });

  return { raw, expiresAt };
}
```

### 5. Data Access Layer (DAL)

```ts
// src/lib/dal.ts
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE_NAME } from '@/lib/session';
import { hashToken } from '@/lib/token';

// Returns session data or null - use on public pages
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

  if (!session || session.expiresAt <= new Date() || !session.owner.staffProfile) {
    return null;
  }

  return { session, user: session.owner, staffProfile: session.owner.staffProfile };
});

// Returns session data or redirects to login - use on protected pages
export const verifySession = cache(async () => {
  const session = await getSession();

  if (!session) {
    redirect('/admin/login');
  }

  return session;
});
```

**Key points:**
- `cache()` deduplicates calls within the same request
- `getSession()` - returns `null` if not authenticated (for public pages)
- `verifySession()` - redirects to login if not authenticated (for admin pages)
- Checks both token validity AND `staffProfile` existence

### 6. Middleware (Route Protection)

```ts
// src/proxy.ts (imported in middleware.ts)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { SESSION_COOKIE_NAME } from '@/lib/session';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isLoginRoute = pathname === '/admin/login' || pathname.startsWith('/admin/login/');
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE_NAME);

  // Redirect unauthenticated users to login (except login routes themselves)
  if (pathname.startsWith('/admin') && !isLoginRoute && !hasSessionCookie) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
}

export const config = {
  matcher: '/admin/:path*',
};
```

This is a fast, edge-compatible check (cookie existence only). The full session validation happens server-side in `verifySession()`.

### 7. Login Page

```tsx
// src/app/admin/login/page.tsx
import { redirect } from 'next/navigation';

import { getSession } from '@/lib/dal';

import { LoginForm } from './login-form';

export default async function AdminLoginPage() {
  const session = await getSession();

  // Already logged in? Redirect to dashboard
  if (session) {
    redirect('/admin/dashboard/shootings');
  }

  return <LoginForm />;
}
```

### 8. Login Form (Client Component)

```tsx
// src/app/admin/login/login-form.tsx
'use client';

import { useActionState } from 'react';

import { requestMagicLink } from './actions';

export function LoginForm() {
  const [state, action, pending] = useActionState(requestMagicLink, undefined);

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold">Admin Login</h1>
        <p className="mt-1 text-sm text-gray-500">
          Enter your email and we'll send you a login link.
        </p>
      </div>
      <form action={action} className="flex flex-col gap-3">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="admin@example.com"
          className="rounded-md border border-gray-300 px-3 py-2"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gray-900 px-3 py-2 text-white disabled:opacity-50"
        >
          {pending ? 'Sending...' : 'Send login link'}
        </button>
      </form>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="text-sm text-green-700">{state.message}</p>}
    </div>
  );
}
```

### 9. Magic Link Server Action

```ts
// src/app/admin/login/actions.ts
'use server';

import { headers } from 'next/headers';
import * as z from 'zod';

import { prisma } from '@/lib/prisma';
import { sendAdminVerificationEmail } from '@/lib/resend/admin-verification';
import { MAGIC_LINK_TTL_MS } from '@/lib/session';
import { generateToken } from '@/lib/token';

const EmailSchema = z.object({ email: z.email() });

export type LoginFormState = { error?: string; message?: string } | undefined;

// Generic message prevents user enumeration
const GENERIC_MESSAGE =
  'If this email is registered, we sent a login link to it.';

export async function requestMagicLink(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = EmailSchema.safeParse({ email: formData.get('email') });

  if (!parsed.success) {
    return { error: 'Please enter a valid email address.' };
  }

  const email = parsed.data.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email },
    include: { staffProfile: true },
  });

  // Only send if user exists AND has staffProfile (is admin)
  if (user?.staffProfile != null) {
    // Rate limit: max 1 magic link per 60 seconds
    const recentToken = await prisma.magicLinkToken.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
        createdAt: { gt: new Date(Date.now() - 60_000) },
      },
    });

    if (!recentToken) {
      const { raw, hash } = generateToken();
      const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

      await prisma.magicLinkToken.create({
        data: { userId: user.id, tokenHash: hash, expiresAt },
      });

      // Build verification URL from request headers
      const headersList = await headers();
      const host = headersList.get('host');
      const proto = headersList.get('x-forwarded-proto') ?? 'http';
      const verifyUrl = `${proto}://${host}/admin/login/verify?token=${raw}`;

      await sendAdminVerificationEmail({
        to: email,
        name: user.firstName,
        verifyUrl,
      });
    }
  }

  // Always return the same message (security)
  return { message: GENERIC_MESSAGE };
}
```

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

  // Check: exists, not used, not expired
  if (!magicLinkToken || magicLinkToken.usedAt || magicLinkToken.expiresAt <= new Date()) {
    return NextResponse.redirect(invalidUrl);
  }

  // Atomically mark as used (prevents race conditions)
  const { count } = await prisma.magicLinkToken.updateMany({
    where: { id: magicLinkToken.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  if (count !== 1) {
    return NextResponse.redirect(invalidUrl);
  }

  // Create session and set cookie
  const { raw, expiresAt } = await createSession(magicLinkToken.userId);

  const response = NextResponse.redirect(new URL('/admin', request.url));
  response.cookies.set(SESSION_COOKIE_NAME, raw, sessionCookieOptions(expiresAt));

  return response;
}
```

### 11. Logout Server Action

```ts
// src/app/admin/actions.ts
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE_NAME } from '@/lib/session';
import { hashToken } from '@/lib/token';

export async function logout() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (rawToken) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(rawToken) } });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect('/admin/login');
}
```

### 12. Admin Dashboard Layout (Protected)

```tsx
// src/app/admin/dashboard/layout.tsx
import { CameraIcon, CalendarRangeIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { verifySession } from '@/lib/dal';

import { logout } from '../actions';

const NAV_ITEMS = [
  { label: 'Bookings', href: '/admin/dashboard/shootings', icon: CameraIcon },
  { label: 'Time Slots', href: '/admin/dashboard/time-slots', icon: CalendarRangeIcon },
];

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // This redirects to /admin/login if not authenticated
  const { user } = await verifySession();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="flex w-64 shrink-0 flex-col justify-between border-r border-gray-300 bg-gray-900 text-white">
        <div>
          <Link
            href="/"
            className="block border-b border-white/10 px-4 py-5 text-xl leading-none font-extrabold tracking-tight"
          >
            YourApp
          </Link>
          <div className="border-b border-white/10 px-4 py-5">
            <p className="text-lg font-semibold">Hello, {user.firstName}!</p>
            <p className="mt-1 text-sm text-white/60">{user.email}</p>
          </div>
          <nav className="flex flex-col gap-1 p-3">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition hover:bg-white/10"
              >
                <item.icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <form action={logout} className="border-t border-white/10 p-3">
          <button
            type="submit"
            className="w-full rounded-md border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
          >
            Logout
          </button>
        </form>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
```

### 13. Admin Root Redirect

```tsx
// src/app/admin/page.tsx
import { redirect } from 'next/navigation';

export default function AdminPage() {
  redirect('/admin/dashboard/shootings');
}
```

### 14. Floating Admin Button

```tsx
// src/components/FloatingAdminButton.tsx
import { LayoutDashboard } from 'lucide-react';
import Link from 'next/link';

export function FloatingAdminButton() {
  return (
    <Link
      href="/admin/dashboard/shootings"
      className="fixed right-5 bottom-5 z-20 inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-3.5 font-bold text-white shadow-xl transition hover:-translate-y-0.5"
    >
      <LayoutDashboard size={18} />
      Admin
    </Link>
  );
}
```

A simple server component - no client JS needed. It's a fixed-position link in the bottom-right corner.

### 15. Rendering the Button on Public Pages

```tsx
// src/app/page.tsx
import { getSession } from '@/lib/dal';
import { FloatingAdminButton } from '@/components/FloatingAdminButton';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getSession();

  return (
    <main>
      {session && <FloatingAdminButton />}
      {/* ... rest of your public page ... */}
    </main>
  );
}
```

**How it works:**
- `getSession()` checks for a valid admin session (returns `null` for regular visitors)
- The button only renders server-side when session exists
- `force-dynamic` ensures the page isn't statically cached (needed because it reads cookies)

### 16. Email Sending (Resend)

```ts
// src/lib/resend/index.ts
import { Resend } from 'resend';
import { env } from '@/env';

export const resend = new Resend(env.RESEND_API_KEY);

// src/lib/resend/admin-verification.ts
import { sendTemplatedEmail } from './send-templated-email';

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

// src/lib/resend/send-templated-email.ts
import { resend } from './index';

type SendTemplatedEmailParams = {
  to: string | string[];
  templateId: string;
  variables?: Record<string, string | number>;
  from?: string;
  subject?: string;
};

export async function sendTemplatedEmail({
  to,
  templateId,
  variables,
  from,
  subject,
}: SendTemplatedEmailParams) {
  return resend.emails.send({
    to,
    from,
    subject,
    template: { id: templateId, variables },
  });
}
```

Alternatively, you can use `react-email` components instead of Resend templates.

---

## Authentication Flow

```
User visits /admin/login
        |
        v
Enters email -> requestMagicLink() server action
        |
        v
Lookup user + staffProfile check
        |
        v
Rate limit check (1 per 60s) -> Generate token (raw + hash)
        |
        v
Store hash in MagicLinkToken table (15min TTL)
        |
        v
Send email with link: /admin/login/verify?token={raw}
        |
        v
User clicks link -> GET /admin/login/verify
        |
        v
Hash token -> Find in DB -> Check not used & not expired
        |
        v
Atomically mark token as used (prevents replay)
        |
        v
createSession() -> Store session hash in DB (30 day TTL)
        |
        v
Set httpOnly cookie with raw token -> Redirect to /admin
        |
        v
Dashboard layout calls verifySession() -> Authenticated!
```

## Security Features

| Feature | Implementation |
|---|---|
| **No passwords** | Magic links only, no password storage |
| **Hashed tokens** | SHA-256 hash stored in DB; raw token only in email/cookie |
| **Rate limiting** | Max 1 magic link per 60 seconds per user |
| **Token expiration** | 15-minute TTL for magic links, 30-day for sessions |
| **One-time tokens** | Atomic `updateMany` prevents replay attacks |
| **httpOnly cookies** | Prevents XSS token theft |
| **Secure cookies** | `secure: true` in production, `sameSite: lax` |
| **No user enumeration** | Same generic message for all email submissions |
| **Staff-only access** | Requires `staffProfile` relation to authenticate |
| **Dual protection** | Middleware (edge, fast) + server-side `verifySession()` |
| **Request deduplication** | `cache()` prevents redundant DB calls per request |

## Dependencies

```json
{
  "next": "^15",
  "@prisma/client": "^6",
  "prisma": "^6",
  "resend": "^4",
  "zod": "^3",
  "lucide-react": "^0.400",
  "@t3-oss/env-core": "^0.11"
}
```
