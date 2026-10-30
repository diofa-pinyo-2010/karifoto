'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import * as z from 'zod';

import { Prisma } from '@/generated/prisma/client';
import { createSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendAdminVerificationEmail } from '@/lib/resend/admin-verification';
import {
  LOGIN_CODE_TTL_SECONDS,
  REDIRECT_URL_PARAM,
  SESSION_COOKIE_NAME,
  sanitizeAdminRedirect,
  sessionCookieOptions,
} from '@/lib/session';
import { generateLoginCode, hashToken, normalizeLoginCode } from '@/lib/token';
import { redis } from '@/lib/upstash';

const EmailSchema = z.object({ email: z.email() });

export type LoginFormState = { error?: string } | undefined;
export type VerifyCodeState = { error?: string } | undefined;

const LOGIN_CODE_SEND_LIMIT_SECONDS = 60;
const LOGIN_CODE_CREATE_ATTEMPTS = 3;

// The code alone identifies the login, so every guess is tested against all
// active codes. Failures are counted per IP and across everyone; the global cap
// is what stops a botnet, at the cost that someone hammering the page can
// pause new staff logins for one window. Logged-in staff are unaffected.
const FAILURE_WINDOW_SECONDS = 15 * 60;
const MAX_FAILURES_PER_IP = 5;
const MAX_FAILURES_GLOBAL = 30;

const WRONG_CODE_ERROR = 'Hibás vagy lejárt kód.';
const RATE_LIMITED_ERROR =
  'Túl sok sikertelen próbálkozás. Próbáld újra néhány perc múlva.';

const loginCodeSendLimitKey = (userId: string) =>
  `login_code_send_rl:${userId}`;
const loginCodeFailIpKey = (ip: string) => `login_code_fail_ip:${ip}`;
const LOGIN_CODE_FAIL_GLOBAL_KEY = 'login_code_fail_global';

async function getClientIp() {
  const forwardedFor = (await headers()).get('x-forwarded-for');
  return forwardedFor?.split(',')[0]?.trim() || null;
}

// Fails open: a Redis outage must not lock staff out, and 8 digits make
// guessing hopeless even without the limiter.
async function isRateLimited(ip: string | null) {
  try {
    const [ipFailures, globalFailures] = await Promise.all([
      ip ? redis.get<number>(loginCodeFailIpKey(ip)) : null,
      redis.get<number>(LOGIN_CODE_FAIL_GLOBAL_KEY),
    ]);

    return (
      (ipFailures ?? 0) >= MAX_FAILURES_PER_IP ||
      (globalFailures ?? 0) >= MAX_FAILURES_GLOBAL
    );
  } catch (error) {
    console.error('Login code rate limit check failed', error);
    return false;
  }
}

async function incrementFailures(key: string) {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, FAILURE_WINDOW_SECONDS);
  }
}

async function recordFailure(ip: string | null) {
  try {
    await Promise.all([
      ip ? incrementFailures(loginCodeFailIpKey(ip)) : null,
      incrementFailures(LOGIN_CODE_FAIL_GLOBAL_KEY),
    ]);
  } catch (error) {
    console.error('Login code failure counter failed', error);
  }
}

// Fails open, like the failure counters.
async function claimSendSlot(userId: string) {
  try {
    const allowed = await redis.set(loginCodeSendLimitKey(userId), '1', {
      nx: true,
      ex: LOGIN_CODE_SEND_LIMIT_SECONDS,
    });
    return allowed !== null;
  } catch (error) {
    console.error('Login code send limit check failed', error);
    return true;
  }
}

// A new code may collide with any stored hash (used and expired ones included,
// `tokenHash` is @unique) — insert and retry on P2002 instead of
// check-then-insert, which would race.
async function createLoginCode(userId: string) {
  for (let attempt = 1; ; attempt++) {
    const { code, hash } = generateLoginCode();
    const expiresAt = new Date(Date.now() + LOGIN_CODE_TTL_SECONDS * 1000);

    try {
      await prisma.magicLinkToken.create({
        data: { userId, tokenHash: hash, expiresAt },
      });
      return code;
    } catch (error) {
      const isCollision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002';

      if (!isCollision || attempt >= LOGIN_CODE_CREATE_ATTEMPTS) {
        throw error;
      }
    }
  }
}

export async function requestLoginCode(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = EmailSchema.safeParse({ email: formData.get('email') });

  if (!parsed.success) {
    return { error: 'Adj meg egy érvényes e-mail címet.' };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const redirectUrl = sanitizeAdminRedirect(formData.get(REDIRECT_URL_PARAM));

  const user = await prisma.user.findUnique({
    where: { email },
    include: { staffProfile: true },
  });

  if (user?.staffProfile != null && (await claimSendSlot(user.id))) {
    try {
      const code = await createLoginCode(user.id);
      await sendAdminVerificationEmail({ to: email, name: user.name, code });
    } catch (error) {
      // Surfacing this would only ever happen for a registered email, so it
      // would leak which ones are. Free the send slot so they can retry now.
      console.error('Sending login code failed', error);
      await redis.del(loginCodeSendLimitKey(user.id)).catch(() => {});
    }
  }

  // Same destination either way — no user enumeration.
  const query = redirectUrl
    ? `?${new URLSearchParams({ [REDIRECT_URL_PARAM]: redirectUrl })}`
    : '';
  redirect(`/admin/login/verify${query}`);
}

export async function verifyLoginCode(
  _prevState: VerifyCodeState,
  formData: FormData,
): Promise<VerifyCodeState> {
  const ip = await getClientIp();

  if (await isRateLimited(ip)) {
    return { error: RATE_LIMITED_ERROR };
  }

  const code = normalizeLoginCode(formData.get('code'));
  const loginCode = code
    ? await prisma.magicLinkToken.findUnique({
        where: { tokenHash: hashToken(code) },
      })
    : null;

  if (!loginCode || loginCode.usedAt || loginCode.expiresAt <= new Date()) {
    await recordFailure(ip);
    return { error: WRONG_CODE_ERROR };
  }

  // Atomic claim — two submits of the same code can't create two sessions.
  const { count } = await prisma.magicLinkToken.updateMany({
    where: { id: loginCode.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  if (count !== 1) {
    await recordFailure(ip);
    return { error: WRONG_CODE_ERROR };
  }

  const { raw, expiresAt } = await createSession(loginCode.userId);
  (await cookies()).set(
    SESSION_COOKIE_NAME,
    raw,
    sessionCookieOptions(expiresAt),
  );

  redirect(sanitizeAdminRedirect(formData.get(REDIRECT_URL_PARAM)) ?? '/admin');
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
