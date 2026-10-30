import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  formatLoginCode,
  generateLoginCode,
  hashToken,
  normalizeLoginCode,
} from '@/lib/token';

// randomInt is a node builtin, so it can't be spied on; this lets one test pin
// the value to check zero-padding while every other call stays truly random.
let nextInt: number | undefined;

vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>();
  return {
    ...actual,
    randomInt: (min: number, max: number) =>
      nextInt ?? actual.randomInt(min, max),
  };
});

afterEach(() => {
  nextInt = undefined;
});

describe('generateLoginCode', () => {
  it('always returns 8 digits', () => {
    for (let i = 0; i < 1000; i++) {
      expect(generateLoginCode().code).toMatch(/^\d{8}$/);
    }
  });

  it('keeps leading zeros', () => {
    nextInt = 12345;
    expect(generateLoginCode().code).toBe('00012345');
  });

  it('returns the hash of the code', () => {
    const { code, hash } = generateLoginCode();
    expect(hash).toBe(hashToken(code));
  });
});

describe('formatLoginCode', () => {
  it('splits the code in the middle', () => {
    expect(formatLoginCode('48219037')).toBe('4821 9037');
  });

  it('keeps leading zeros', () => {
    expect(formatLoginCode('00012345')).toBe('0001 2345');
  });
});

describe('normalizeLoginCode', () => {
  it.each(['48219037', '4821 9037', '4821-9037'])('accepts %j', (input) => {
    expect(normalizeLoginCode(input)).toBe('48219037');
  });

  it.each(['1234567', '123456789', '', null, 'abcdefgh'])(
    'rejects %j',
    (input) => {
      expect(normalizeLoginCode(input)).toBeNull();
    },
  );
});
