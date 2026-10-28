import { describe, expect, it } from 'vitest';

import { getInitials, getShootingEndTime } from '@/lib/utils';

describe('getShootingEndTime', () => {
  const start = new Date('2026-12-10T10:00:00Z');

  it('ends after the package duration', () => {
    expect(getShootingEndTime(start, 'MINI').toISOString()).toBe(
      '2026-12-10T10:30:00.000Z',
    );
    expect(getShootingEndTime(start, 'PARTY').toISOString()).toBe(
      '2026-12-10T11:30:00.000Z',
    );
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
