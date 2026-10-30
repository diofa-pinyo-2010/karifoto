# Admin login: replace the magic link with a one-time code

Date: 2026-10-30 · Branch: `admin-otp-login`

## Intent

Staff log in to `/admin` with a magic link today. The link opens in whatever
browser the email client picks — often Gmail's in-app browser — so the session
cookie lands in the wrong browser. A typed code lets the staff member log in
**in the browser they typed it into**.

Context: 5–10 staff accounts, sessions last 60 days, each person logs in a
handful of times per 60 days (once per browser/device). At any moment there are
usually zero active codes, rarely more than one or two.

## Goals

1. `/admin/login`: enter email, submit. If it belongs to a staff member, email
   them an 8-digit code. Either way the form **redirects to
   `/admin/login/verify`**, so the response reveals nothing about which emails
   are registered.
2. `/admin/login/verify`: explanation text + an 8-slot `InputOTP`. A valid code
   logs in the current browser.
3. Logged-in admins are unaffected.

## Non-goals / anti-goals

- **No binding of the code to the browser that requested it.** No attempt
  cookie, no "same browser" check. Anyone, on any device, who opens the verify
  page and types a valid code gets logged in. That is the point of the change.
- No change to `Session`, the `admin_session` cookie, `createSession`,
  `src/lib/dal.ts` or `src/proxy.ts`.
- No change to the client portal (`ClientPortalToken`, `/client/*`,
  `/api/client-portal/verify`) — its long-lived link is deliberate.
- No schema migration.

## Decisions

### Code

- **8 decimal digits**, `crypto.randomInt(0, 10 ** 8)` zero-padded to 8 chars.
  Shown as `4821 9037` (space in the middle) in the email.
- **TTL 10 minutes** (was 15). Single use.
- An older still-valid code keeps working after a new one is requested — emails
  can arrive out of order, whichever arrives first should work.

### Storage — reuse `MagicLinkToken`, no migration

- Store `sha256(code)` (existing `hashToken`) in `MagicLinkToken.tokenHash`.
  Plain SHA-256 is acceptable: a leaked hash is dead within 10 min and single
  use, so an HMAC secret is not worth a new env var.
- Model is **not** renamed (cosmetic churn, would need a migration).
- Uniqueness: insert and catch Prisma `P2002` on `tokenHash` (the `@unique`
  covers all rows, used and expired included); on `P2002` generate a fresh code
  and retry, **up to 3 attempts**, then throw. Do **not** check-then-insert
  (race).
- Verify uses `findUnique({ where: { tokenHash } })`, so a code identifies
  exactly one row/user.

### Brute-force protection (Redis, `src/lib/upstash` client)

The code alone identifies the login, so every guess is tested against all
active codes. Two **failure** counters, both checked before and incremented
after a failed attempt:

- **Per IP:** 5 failures / 15 min. IP from the `x-forwarded-for` header (first
  entry; Vercel sets it) via `headers()`. Missing header → skip the per-IP
  counter, the global one still applies.
- **Global:** 30 failures / 15 min across all IPs.
- Fixed window: `INCR` + `EXPIRE` on first increment (key per window or `EX` on
  creation — builder's choice).
- **Fail open:** if Redis errors, allow the attempt (log the error). Same stance
  as the Stripe webhook guard; an Upstash outage must not lock staff out. 8
  digits makes guessing hopeless even without the limiter.
- Successful logins do not touch the counters.
- Accepted risk: someone scripting wrong guesses can block **new** staff logins
  for up to 15 min. Logged-in staff are unaffected. Owner considers this a mild
  annoyance.
- Keys live with the rest of the auth Redis keys in
  `src/server/admin-auth.ts` (where `magic_link_rl:` already is), not in
  `src/lib/idempotency.ts` (that file is for idempotency markers). Rename the
  existing send-limit key/constant to code-wording; the old 60s keys simply
  expire.

### Server actions (`src/server/admin-auth.ts`)

**`requestLoginCode`** (replaces `requestMagicLink`):

1. zod email check. Malformed email → `{ error: 'Adj meg egy érvényes e-mail címet.' }`
   (inline, as today).
2. Staff lookup (`user.staffProfile != null`), existing **60s per-user send
   limit** (`SET NX EX 60`).
3. If staff and allowed: create code row (retry rule above), send email.
4. **Always** `redirect('/admin/login/verify' + (redirectUrl ? '?redirectUrl=…' : ''))`
   — sanitized via `sanitizeAdminRedirect`, using `REDIRECT_URL_PARAM`. Unknown
   email, rate-limited, and success all look identical.

Failure handling (call made during design review):

- The 60s send limit **fails open** too: wrap the `SET NX` in try/catch, log,
  and proceed as allowed. Otherwise a Redis outage still locks staff out at
  this step.
- If code creation (retries exhausted) or the email send throws: `console.error`,
  **delete the send-limit key** (best effort) so they can retry immediately,
  and **still redirect** to verify. Surfacing an error would only happen for
  registered staff and so leak registration. The staff member sees no code
  arrive and uses "Új kód kérése".
- `redirect()` throws by design in Next — keep it outside the try/catch.

**`verifyLoginCode`** (replaces `src/app/admin/login/verify/route.ts`, which is
deleted — a `route.ts` and `page.tsx` cannot share a folder):

1. Read `code` (strip non-digits; must be exactly 8 digits, else the generic
   wrong-code error, counted as a failure) and `redirectUrl` from the form.
2. If either failure counter is over its limit → rate-limit error.
3. `findUnique` by hash; must exist, `usedAt == null`, `expiresAt > now`.
   Atomic claim: `updateMany({ where: { id, usedAt: null }, data: { usedAt: now } })`,
   `count === 1`.
4. Any failure in 3 → increment both counters, return wrong-code error.
5. Success → `createSession(userId)`, set `admin_session` cookie with
   `sessionCookieOptions(expiresAt)` via `cookies()`, `redirect` to
   `sanitizeAdminRedirect(redirectUrl) ?? '/admin'`.

Return shape follows repo convention: `{ error: '<Hungarian>' }`, no throws for
user errors.

Hungarian copy:

- Wrong / expired / used (one message for all): `Hibás vagy lejárt kód.`
- Rate limited: `Túl sok sikertelen próbálkozás. Próbáld újra néhány perc múlva.`

`logout` is unchanged.

### Pages

Same shadcn `Card` look as today's login (see mockup in
`.superpowers/brainstorm/…/content/pages.html`, not committed).

**`/admin/login`** (`page.tsx` + `login-form.tsx`): copy changes "link" →
"kód": description `Add meg az e-mail címed, és küldünk egy belépési kódot.`,
button `Belépési kód küldése` / pending `Küldés...`. The success `message`
branch goes away (the action redirects). Already-logged-in visitors still get
redirected as today.

**`/admin/login/verify`** (new `page.tsx` + client form component):

- If already logged in (`getSession()`), redirect like the login page does.
- Heading `Írd be a kódot`; text derived from `GENERIC_MESSAGE`:
  `Ha ez az e-mail cím regisztrálva van, elküldtük rá a belépési kódot. 10 percig érvényes.`
  plus the hint `Új kódot legfeljebb percenként kérhetsz.`
- `InputOTP` from shadcn (`pnpm dlx shadcn@latest add input-otp`, adds the
  `input-otp` dependency), used exactly as:

  ```tsx
  import { REGEXP_ONLY_DIGITS } from 'input-otp';
  <InputOTP maxLength={8} pattern={REGEXP_ONLY_DIGITS} …>
  ```

  Two groups of 4 with an `InputOTPSeparator`. Verify the generated component
  works with the `base-nova` style before building on it.

- **Auto-submits** when the 8th digit is entered (`onComplete` → submit form);
  a `Belépés` submit button stays for paste/accessibility. Pending state
  disables input + button.
- On error: show the message under the field and clear the input.
- `redirectUrl` from `searchParams`, sanitized, passed as hidden input.
- Link `Nem jött meg a kód? Új kód kérése` → `/admin/login` (carrying
  `redirectUrl`). Nothing more — the page doesn't know the email.

### Email (`src/emails/AdminLogin.tsx`, `src/lib/resend/admin-verification.ts`)

- Props `{ name, code, baseUrl }` (replace `verifyUrl`). Remove the button, the
  URL copy and `unlinkifiedUrl`.
- Content: logo, `Kedves {name}!`, `A belépési kódod:`, the code large,
  monospace, spaced (`4821 9037`, via `formatLoginCode`), then
  `Írd be a megnyitott belépési oldalon, bármelyik böngészőben. 10 percig érvényes, egyszer használható.`
  and `Ha nem te kérted, nyugodtan hagyd figyelmen kívül.`, sign-off.
- Drop today's incorrect "30 napig" session line (session is 60 days).
- Subject: `🔓 Belépési kód`. Update `PreviewProps` and the preview in
  `src/lib/email-previews.tsx`. Email `type: 'ADMIN_LOGIN'` unchanged.
- Builder's call: whether the code also appears in the subject. Default: no
  (keeps it out of notification previews on lock screens).

### Pure helpers + tests

In `src/lib/token.ts`:

- `generateLoginCode(): { code: string; hash: string }` — mirrors
  `generateToken`.
- `formatLoginCode(code: string): string` — `'48219037'` → `'4821 9037'`.
  Could live in `src/lib/formatters.ts` instead; builder's call.

Vitest (`src/lib/token.test.ts`): code is 8 digits incl. leading zeros
(mock/inspect padding), hash equals `hashToken(code)`, formatting.

### Constants (`src/lib/session.ts`)

`MAGIC_LINK_TTL_SECONDS` → `LOGIN_CODE_TTL_SECONDS = 10 * 60`.

## Files touched (expected)

- `src/server/admin-auth.ts` — actions, Redis keys.
- `src/app/admin/login/login-form.tsx`, `page.tsx` — copy, redirect flow.
- `src/app/admin/login/verify/route.ts` — **delete**.
- `src/app/admin/login/verify/page.tsx` + `verify-form.tsx` — new.
- `src/components/ui/input-otp.tsx` — shadcn add; `package.json` / lockfile.
- `src/lib/token.ts` + `src/lib/token.test.ts`.
- `src/lib/session.ts`.
- `src/emails/AdminLogin.tsx`, `src/lib/resend/admin-verification.ts`,
  `src/lib/email-previews.tsx`.
- `src/app/api/client-portal/verify/route.ts` — only the comment that says it
  "mirrors src/app/admin/login/verify/route.ts" (point it at the history, or
  describe the difference standalone).
- Docs: `src/docs/admin-auth-guide.md` (sections 7–10, 13, Authentication
  Flow, Security Features) and `CLAUDE.md` ("Staff log in with a
  `MagicLinkToken`…").

## Constraints

Repo rules from `CLAUDE.md` / `AGENTS.md`: `@/` imports only, server actions
return `{ error }` with Hungarian copy, env only via `src/env.ts` (no new env
vars needed), oxlint + oxfmt clean, Vitest for pure functions only, no work on
`main`, read `node_modules/next/dist/docs/` for Next 16 APIs (`redirect` in
server actions, `cookies()` / `headers()` async). The owner tests flows
manually; automated checks are `typecheck`, `lint`, `fmt:check`, `test:run`.

## Left to the builder

- Exact Redis window mechanics and key names.
- Component split on the verify page.
- Exact wording of the doc updates.
- Where `formatLoginCode` lives.
