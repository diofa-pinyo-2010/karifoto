import { describe, expect, it } from 'vitest';

import { getInitials, getShootingEndTime } from '@/lib/utils';

import type { Package } from '@/generated/prisma/enums';

describe('getShootingEndTime', () => {
  const start = new Date('2026-12-10T10:00:00Z');

  const end = (pkg: Package, isLightPlaySelected: boolean) =>
    getShootingEndTime(start, pkg, isLightPlaySelected).toISOString();

  it('uses the calendar duration of the package', () => {
    expect(end('MINI', false)).toBe('2026-12-10T10:30:00.000Z');
    expect(end('CLASSIC', false)).toBe('2026-12-10T10:40:00.000Z');
    expect(end('FAMILY', false)).toBe('2026-12-10T10:50:00.000Z');
    expect(end('PARTY', false)).toBe('2026-12-10T12:00:00.000Z');
  });

  it('adds 10 minutes for a paid light play', () => {
    expect(end('MINI', true)).toBe('2026-12-10T10:40:00.000Z');
    expect(end('CLASSIC', true)).toBe('2026-12-10T10:50:00.000Z');
  });

  it('ignores the flag when light play is included in the package', () => {
    expect(end('FAMILY', true)).toBe('2026-12-10T10:50:00.000Z');
    expect(end('PARTY', true)).toBe('2026-12-10T12:00:00.000Z');
  });
});

describe('getInitials', () => {
  it('takes the first letter of the first two words', () => {
    expect(getInitials('Kovács Anna')).toBe('KA');
    expect(getInitials('  Nagy   Éva Mária ')).toBe('NÉ');
  });

  it('takes the first two letters of a single word', () => {
    expect(getInitials('Bence')).toBe('BE');
    expect(getInitials('öcsi')).toBe('ÖC');
    expect(getInitials('X')).toBe('X');
  });

  it('falls back to a question mark for an empty name', () => {
    expect(getInitials('')).toBe('?');
    expect(getInitials('   ')).toBe('?');
  });
});
