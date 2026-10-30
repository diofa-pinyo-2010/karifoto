import { createHash, randomBytes, randomInt } from 'node:crypto';

const LOGIN_CODE_LENGTH = 8;

export function generateToken() {
  const raw = randomBytes(32).toString('base64url');
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string) {
  return createHash('sha256').update(raw).digest('hex');
}

export function generateLoginCode() {
  const code = randomInt(0, 10 ** LOGIN_CODE_LENGTH)
    .toString()
    .padStart(LOGIN_CODE_LENGTH, '0');
  return { code, hash: hashToken(code) };
}

// '48219037' → '4821 9037' — easier to read off the email and type back.
export function formatLoginCode(code: string) {
  const half = code.length / 2;
  return `${code.slice(0, half)} ${code.slice(half)}`;
}

// A pasted code may carry the space from the email, or a dash; anything else
// that isn't exactly LOGIN_CODE_LENGTH digits is not a code.
export function normalizeLoginCode(input: unknown): string | null {
  if (typeof input !== 'string') {
    return null;
  }

  const digits = input.replace(/[\s-]/g, '');
  return new RegExp(`^\\d{${LOGIN_CODE_LENGTH}}$`).test(digits) ? digits : null;
}
