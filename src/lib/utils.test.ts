import { describe, expect, it } from 'vitest';

import { getShootingEndTime } from '@/lib/utils';

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
