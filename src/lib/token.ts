import { createHash, randomBytes } from 'node:crypto';

export function generateToken() {
  const raw = randomBytes(32).toString('base64url');
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string) {
  return createHash('sha256').update(raw).digest('hex');
}
