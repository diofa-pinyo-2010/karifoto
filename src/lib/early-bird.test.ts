import { describe, expect, it } from 'vitest';

import { dbDateToDayKey, earlyBirdDeadlineFromDayKey } from '@/lib/early-bird';

describe('earlyBirdDeadlineFromDayKey', () => {
  it('is Budapest midnight of the picked day in winter (+01:00)', () => {
    expect(earlyBirdDeadlineFromDayKey('2026-11-21')?.toISOString()).toBe(
      '2026-11-20T23:00:00.000Z',
    );
  });

  it('is Budapest midnight of the picked day in summer (+02:00)', () => {
    expect(earlyBirdDeadlineFromDayKey('2027-07-01')?.toISOString()).toBe(
      '2027-06-30T22:00:00.000Z',
    );
  });

  it('handles the day after the autumn DST switch', () => {
    // 2026-10-25 03:00 CEST → 02:00 CET, so the 26th already starts at +01:00.
    expect(earlyBirdDeadlineFromDayKey('2026-10-26')?.toISOString()).toBe(
      '2026-10-25T23:00:00.000Z',
    );
  });

  it('a slot at 23:30 the evening before is still early bird, midnight is not', () => {
    const deadline = earlyBirdDeadlineFromDayKey('2026-11-21')!;
    const eveningBefore = new Date('2026-11-20T22:30:00Z'); // 23:30 Budapest
    const midnight = new Date('2026-11-20T23:00:00Z'); // 00:00 Budapest

    expect(eveningBefore < deadline).toBe(true);
    expect(midnight < deadline).toBe(false);
  });

  it('returns null when no deadline is set', () => {
    expect(earlyBirdDeadlineFromDayKey(null)).toBeNull();
  });
});

describe('dbDateToDayKey', () => {
  it('reads the stored day from a Prisma DATE value (UTC midnight)', () => {
    expect(dbDateToDayKey(new Date('2026-11-21T00:00:00Z'))).toBe('2026-11-21');
  });

  it('returns null for null', () => {
    expect(dbDateToDayKey(null)).toBeNull();
  });
});
