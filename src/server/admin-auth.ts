'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import * as z from 'zod';

import { env } from '@/env';
import { prisma } from '@/lib/prisma';
import { sendAdminVerificationEmail } from '@/lib/resend/admin-verification';
import { MAGIC_LINK_TTL_SECONDS, SESSION_COOKIE_NAME } from '@/lib/session';
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

      const verifyUrl = `${env.NEXT_PUBLIC_SITE_URL}/admin/login/verify?token=${raw}`;

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
