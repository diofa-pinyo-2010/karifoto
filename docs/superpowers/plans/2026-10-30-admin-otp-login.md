# Admin OTP Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the staff magic-link login with an 8-digit emailed code typed on `/admin/login/verify`, logging in whichever browser it's typed into.

**Architecture:** `requestLoginCode` (server action) stores `sha256(code)` in the existing `MagicLinkToken` table and always redirects to the verify page. `verifyLoginCode` (server action) replaces `verify/route.ts`: per-IP + global Redis failure counters, atomic claim, `createSession`, cookie, redirect. Pure helpers in `src/lib/token.ts` carry the testable logic.

**Tech Stack:** Next.js 16 server actions, Prisma 7, Upstash Redis, React Email, shadcn `input-otp` (base-nova), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-30-admin-otp-login-design.md`

## Global Constraints

- Work on branch `admin-otp-login`; never commit to or push `main`.
- `@/` imports only (no `./` / `../`). Prisma types from `@/generated/prisma/client`.
- Server actions return `{ error: '<Hungarian>' }` for user errors; never throw for them. `redirect()` throws by design — call it outside any try/catch.
- No new env vars; no schema migration; `MagicLinkToken` is not renamed.
- Do not change `Session`, `createSession`, `sessionCookieOptions`, `src/lib/dal.ts`, `src/proxy.ts`, or the client portal behaviour.
- Code: 8 digits, `crypto.randomInt`, zero-padded. TTL `LOGIN_CODE_TTL_SECONDS = 10 * 60`. Send limit 60 s/user. Failure limits: 5 per IP / 15 min, 30 global / 15 min. All Redis calls fail open (log + allow).
- Copy (verbatim): wrong/expired/used `Hibás vagy lejárt kód.` · rate limited `Túl sok sikertelen próbálkozás. Próbáld újra néhány perc múlva.` · bad email `Adj meg egy érvényes e-mail címet.`
- Read the relevant guide in `node_modules/next/dist/docs/01-app/` (server actions, `redirect`, `cookies`, `headers`) before writing Next code.
- Every task ends green on: `pnpm typecheck && pnpm lint && pnpm fmt:check && pnpm test:run`. Run `pnpm fmt` before committing. Owner does manual E2E; don't attempt browser tests.

## Review Focus

1. Code pasted with a space or dash (`4821 9037`, `4821-9037`) must verify — `normalizeLoginCode` test in Task 1.
2. Codes with leading zeros (`00012345`) must survive generation, formatting and verify — padding tests in Task 1.
3. Auto-submit firing while the user also presses the button (double submit) must not create two sessions or count the winning attempt as a failure — atomic claim + `pending` disables input/button (Task 4 manual check list).
4. Verify page opened on another device with no `redirectUrl` lands on `/admin`; a hostile `redirectUrl` (`//evil.com`, `/admin/login`) is ignored — `sanitizeAdminRedirect` used on both actions (Task 3); it has no tests yet, so Task 1 adds characterization tests.
5. Registered vs unregistered email: identical outcome even when Resend or code creation throws — Task 3 try/catch structure.

---

### Task 1: Pure login-code helpers

**Files:**

- Modify: `src/lib/token.ts`
- Create: `src/lib/token.test.ts`, `src/lib/session.test.ts`

**Interfaces:**

- Produces:
  - `LOGIN_CODE_LENGTH = 8`
  - `generateLoginCode(): { code: string; hash: string }` — `hash === hashToken(code)`
  - `formatLoginCode(code: string): string` — `'48219037'` → `'4821 9037'`
  - `normalizeLoginCode(input: unknown): string | null` — strips non-digits; returns the 8-digit string or `null`

- [ ] **Step 1: Write failing tests** in `src/lib/token.test.ts` (`describe/it/expect` from vitest, like `src/lib/utils.test.ts`):
  - `generateLoginCode` returns `code` matching `/^\d{8}$/` (loop 1000×) and `hash === hashToken(code)`.
  - leading zeros: `vi.mock('node:crypto', …)` at file top, keeping the real module but making `randomInt` return a test-controlled `nextInt` when set (real `randomInt` otherwise); set `nextInt = 12345` → `code === '00012345'`. No test-only exports (repo rule: export only what another file imports).
  - `formatLoginCode('48219037') === '4821 9037'`, `formatLoginCode('00012345') === '0001 2345'`.
  - `normalizeLoginCode('48219037') === '48219037'`, `('4821 9037')`, `('4821-9037')` → `'48219037'`; `('1234567')`, `('123456789')`, `('')`, `(null)`, `('abcdefgh')` → `null`.
  - New `src/lib/session.test.ts` (characterization, should pass immediately): `sanitizeAdminRedirect('/admin/shootings') === '/admin/shootings'`; `null` for `'//evil.com'`, `'https://evil.com'`, `'/admin/login'`, `'/admin/login/verify'`, `undefined`, `42`. If any case fails, stop and report rather than changing `sanitizeAdminRedirect`.

- [ ] **Step 2:** `pnpm test:run src/lib/token.test.ts` → FAIL (functions not exported).

- [ ] **Step 3: Implement** the three functions + constant in `src/lib/token.ts` (`randomInt(0, 10 ** LOGIN_CODE_LENGTH)` → `padStart`).

- [ ] **Step 4:** `pnpm test:run src/lib/token.test.ts` → PASS; full check suite green.

- [ ] **Step 5: Commit** `feat: login code helpers`.

---

### Task 2: Email shows the code

**Files:**

- Modify: `src/emails/AdminLogin.tsx`, `src/lib/resend/admin-verification.ts`

**Interfaces:**

- Consumes: `formatLoginCode` (Task 1).
- Produces: `sendAdminVerificationEmail({ to: string; name: string; code: string })`; `AdminLoginEmail` props `{ name: string; code: string; baseUrl: string }`; `ADMIN_LOGIN_SUBJECT = '🔓 Belépési kód'`.

- [ ] **Step 1:** In `AdminLogin.tsx`: replace `verifyUrl` with `code`; delete `unlinkifiedUrl`, the `Button`, the URL block and the "30 napig" sentence and the `/admin/login` CodeInline paragraph. Body copy (verbatim, Hungarian): `Kedves {name}!` · `A belépési kódod:` · code block (`formatLoginCode(code)`, large monospace, wide letter-spacing, gray-100 rounded background, centered) · `Írd be a megnyitott belépési oldalon, bármelyik böngészőben. 10 percig érvényes, egyszer használható.` · small gray `Ha nem te kérted, nyugodtan hagyd figyelmen kívül.` · `📸 Karifoto Team`. `PreviewProps.code = '48219037'`. Remove now-unused imports.
- [ ] **Step 2:** Update `admin-verification.ts` to the new params. `src/lib/email-previews.tsx` needs no change (spreads `PreviewProps`) — confirm with typecheck.
- [ ] **Step 3:** Typecheck will fail only at the caller in `src/server/admin-auth.ts`; to keep this task green, change that call site minimally to pass `code: raw` (temporary — the token is still a magic-link token there; Task 3 rewrites it). Run full check suite → green.
- [ ] **Step 4: Commit** `feat: admin login email shows a code`.

---

### Task 3: Server actions, login form, remove route

**Files:**

- Modify: `src/lib/session.ts` (rename `MAGIC_LINK_TTL_SECONDS` → `LOGIN_CODE_TTL_SECONDS = 10 * 60 // 10 minutes`)
- Modify: `src/server/admin-auth.ts`
- Modify: `src/app/admin/login/login-form.tsx`
- Delete: `src/app/admin/login/verify/route.ts`
- Modify: `src/app/api/client-portal/verify/route.ts` (comment only)

**Interfaces:**

- Consumes: `generateLoginCode`, `normalizeLoginCode`, `hashToken` (Task 1); `sendAdminVerificationEmail({ to, name, code })` (Task 2); existing `createSession(userId)`, `sessionCookieOptions`, `sanitizeAdminRedirect`, `REDIRECT_URL_PARAM`, `SESSION_COOKIE_NAME`.
- Produces (all in `'use server'` `src/server/admin-auth.ts`):
  - `type LoginFormState = { error?: string } | undefined`
  - `requestLoginCode(prev: LoginFormState, formData: FormData): Promise<LoginFormState>` — form fields `email`, `redirectUrl`
  - `type VerifyCodeState = { error?: string } | undefined`
  - `verifyLoginCode(prev: VerifyCodeState, formData: FormData): Promise<VerifyCodeState>` — form fields `code`, `redirectUrl`
  - `logout()` unchanged.

- [ ] **Step 1: Redis helpers** (module-private, non-exported, in `admin-auth.ts`):
  - keys: `login_code_send_rl:${userId}` (replaces `magic_link_rl:`), `login_code_fail_ip:${ip}`, `login_code_fail_global`. Constants `LOGIN_CODE_SEND_LIMIT_SECONDS = 60`, `FAILURE_WINDOW_SECONDS = 15 * 60`, `MAX_FAILURES_PER_IP = 5`, `MAX_FAILURES_GLOBAL = 30`.
  - `isRateLimited(ip: string | null): Promise<boolean>` — reads both counters; true if `ip` count ≥ 5 or global ≥ 30; on error log and return `false`.
  - `recordFailure(ip: string | null): Promise<void>` — `incr`; when the result is `1`, `expire(key, FAILURE_WINDOW_SECONDS)`; skip the IP key when `ip` is null; on error log.
  - `getClientIp(): Promise<string | null>` — `(await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() || null`.
- [ ] **Step 2: `requestLoginCode`**:
  1. zod parse → bad email returns the bad-email error.
  2. `redirectUrl = sanitizeAdminRedirect(formData.get(REDIRECT_URL_PARAM))`.
  3. Staff lookup as today. If staff: send-limit `SET NX EX 60` inside try/catch (error → log, treat as allowed). If allowed, in a try/catch: create row with `generateLoginCode()` and `expiresAt = now + LOGIN_CODE_TTL_SECONDS`, retrying on `Prisma.PrismaClientKnownRequestError` with `code === 'P2002'` up to 3 attempts total, then rethrow; then send the email with the plain code. Catch → `console.error`, best-effort `redis.del(sendKey)` (own try/catch).
  4. Outside all try/catch: `redirect('/admin/login/verify' + (redirectUrl ? '?' + new URLSearchParams({ [REDIRECT_URL_PARAM]: redirectUrl }) : ''))`.
  - Delete `GENERIC_MESSAGE` from this file (its text moves to the verify page in Task 4).
- [ ] **Step 3: `verifyLoginCode`**:
  1. `ip = await getClientIp()`; if `await isRateLimited(ip)` → rate-limit error.
  2. `code = normalizeLoginCode(formData.get('code'))`; `null` → `recordFailure`, wrong-code error.
  3. `findUnique({ where: { tokenHash: hashToken(code) } })`; reject if missing / `usedAt` / `expiresAt <= now`; atomic `updateMany({ where: { id, usedAt: null }, data: { usedAt: new Date() } })`, require `count === 1`. Any rejection → `recordFailure`, wrong-code error.
  4. `createSession(userId)` → `(await cookies()).set(SESSION_COOKIE_NAME, raw, sessionCookieOptions(expiresAt))` → `redirect(sanitizeAdminRedirect(formData.get(REDIRECT_URL_PARAM)) ?? '/admin')`.
- [ ] **Step 4: Login form** (`login-form.tsx`): use `requestLoginCode`; description `Add meg az e-mail címed, és küldünk egy belépési kódot.`; button `Belépési kód küldése` / `Küldés...`; remove the `state.message` branch and `FieldDescription` import if unused.
- [ ] **Step 5:** Delete `src/app/admin/login/verify/route.ts`. In `src/app/api/client-portal/verify/route.ts` rewrite the "This mirrors src/app/admin/login/verify/route.ts…" paragraph to stand alone: it deliberately never claims the token (no `usedAt`), unlike single-use staff login codes, because claiming would lock a client out after clearing cookies.
- [ ] **Step 6:** Full check suite → green. (`/admin/login/verify` 404s until Task 4 — expected.)
- [ ] **Step 7: Commit** `feat: login code server actions`.

---

### Task 4: Verify page with InputOTP

**Files:**

- Create: `src/components/ui/input-otp.tsx` (via shadcn), `package.json`, `pnpm-lock.yaml`
- Create: `src/app/admin/login/verify/page.tsx`, `src/app/admin/login/verify/verify-form.tsx`

**Interfaces:**

- Consumes: `verifyLoginCode`, `VerifyCodeState` (Task 3); `getSession` (`@/lib/dal`); `APP_URLS.upcomingShootings`; `REDIRECT_URL_PARAM`, `sanitizeAdminRedirect`.
- Produces: `VerifyForm({ redirectUrl }: { redirectUrl: string | null })`.

- [ ] **Step 1:** `pnpm dlx shadcn@latest add input-otp`. Check the generated file uses `@/` imports (fix any relative import), passes lint/fmt, and exports `InputOTP`, `InputOTPGroup`, `InputOTPSlot`, `InputOTPSeparator`. If the base-nova variant is broken, report back before hand-patching.
- [ ] **Step 2: `page.tsx`** — mirror `src/app/admin/login/page.tsx`: logged in → `redirect(APP_URLS.upcomingShootings)`; read + sanitize `redirectUrl` from `searchParams`; render `<VerifyForm redirectUrl={…} />`.
- [ ] **Step 3: `verify-form.tsx`** (`'use client'`, same Card layout as `login-form.tsx`), `useActionState(verifyLoginCode, undefined)`:
  - Heading `Írd be a kódot`; muted text `Ha ez az e-mail cím regisztrálva van, elküldtük rá a belépési kódot. 10 percig érvényes.` and `Új kódot legfeljebb percenként kérhetsz.`
  - `<InputOTP name="code" maxLength={8} pattern={REGEXP_ONLY_DIGITS} autoFocus disabled={pending} onComplete={…}>` with `REGEXP_ONLY_DIGITS` imported from `input-otp`; two `InputOTPGroup`s of 4 slots with `InputOTPSeparator` between. Controlled `value` state.
  - `onComplete` → `formRef.current?.requestSubmit()`.
  - Hidden `redirectUrl` input when present. Submit `Button` `Belépés` (disabled while `pending`).
  - `state?.error` → `FieldError` under the field; clear the value when a new error arrives (effect keyed on `state`).
  - Footer: `Nem jött meg a kód?` + `Link` `Új kód kérése` → `/admin/login` (+ `?redirectUrl=` when present).
- [ ] **Step 4:** Full check suite → green.
- [ ] **Step 5:** Hand off to owner for manual QA checklist: request with staff email / unknown email (identical redirect); code from email logs in another browser; paste `4821 9037` works; wrong code ×6 from one IP → rate-limit message; reused code rejected; `redirectUrl` round-trip; email preview at `/admin/email-previews`.
- [ ] **Step 6: Commit** `feat: admin login verify page with InputOTP`.

---

### Task 5: Docs

**Files:**

- Modify: `src/docs/admin-auth-guide.md` (sections 3, 7–10, 13, Authentication Flow, Security Features), `CLAUDE.md` (Auth section line "Staff log in with a `MagicLinkToken`…")

- [ ] **Step 1:** Update the guide to describe the code flow: why (browser choice), `MagicLinkToken` now stores code hashes, 10-min TTL, the two failure limits and fail-open stance, no browser binding (deliberate). Replace code excerpts of the removed route with a short description pointing at `src/server/admin-auth.ts`.
- [ ] **Step 2:** `CLAUDE.md`: "Staff log in with an 8-digit emailed code (stored hashed in `MagicLinkToken`, single-use, 10 min), typed on `/admin/login/verify` in any browser."
- [ ] **Step 3:** `pnpm fmt:check` → green. Commit `docs: admin OTP login`.
