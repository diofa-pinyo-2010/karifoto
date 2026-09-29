import { SessionKind } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import {
  CLIENT_PORTAL_TOKEN_TTL_SECONDS,
  CLIENT_SESSION_TTL_SECONDS,
  SESSION_TTL_SECONDS,
} from '@/lib/session';
import { generateToken } from '@/lib/token';

const SESSION_TTL_BY_KIND: Record<SessionKind, number> = {
  [SessionKind.ADMIN]: SESSION_TTL_SECONDS,
  [SessionKind.CLIENT]: CLIENT_SESSION_TTL_SECONDS,
};

export async function createSession(
  userId: string,
  kind: SessionKind = SessionKind.ADMIN,
) {
  const { raw, hash } = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_BY_KIND[kind] * 1000);

  await prisma.session.create({
    data: { userId, tokenHash: hash, expiresAt, kind },
  });

  return { raw, expiresAt };
}

// The client portal's bootstrap credential, emailed with the booking
// confirmation. Unlike a magic link this is never claimed — see the
// ClientPortalToken comment in prisma/schema.prisma.
export async function createClientPortalToken(userId: string) {
  const { raw, hash } = generateToken();
  const expiresAt = new Date(
    Date.now() + CLIENT_PORTAL_TOKEN_TTL_SECONDS * 1000,
  );

  await prisma.clientPortalToken.create({
    data: { userId, tokenHash: hash, expiresAt },
  });

  return { raw, expiresAt };
}
