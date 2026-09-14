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
