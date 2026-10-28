import { describe, expect, it } from 'vitest';

import { EARLY_BIRD_DATE_DEADLINE } from '@/lib/constants';
import { splitPublicTimeSlots } from '@/lib/public-time-slots';

const DEADLINE = new Date(EARLY_BIRD_DATE_DEADLINE);
const HOUR = 60 * 60 * 1000;

const at = (offsetMs: number, base: Date = DEADLINE) =>
  new Date(base.getTime() + offsetMs).toISOString();

describe('splitPublicTimeSlots', () => {
  const now = new Date(DEADLINE.getTime() - 48 * HOUR);

  it('drops early-bird slots that already started', () => {
    const slots = [
      { id: 'past', startTime: at(-HOUR, now) },
      { id: 'now', startTime: now.toISOString() },
      { id: 'future', startTime: at(HOUR, now) },
    ];

    const { earlyBird, normal } = splitPublicTimeSlots(slots, now);

    expect(earlyBird.map((s) => s.id)).toEqual(['now', 'future']);
    expect(normal).toEqual([]);
  });

  it('puts slots from the deadline on into normal, never into early bird', () => {
    const slots = [
      { id: 'before', startTime: at(-1) },
      { id: 'exactly', startTime: at(0) },
      { id: 'after', startTime: at(HOUR) },
    ];

    const { earlyBird, normal } = splitPublicTimeSlots(slots, now);

    expect(earlyBird.map((s) => s.id)).toEqual(['before']);
    expect(normal.map((s) => s.id)).toEqual(['exactly', 'after']);
  });

  it('keeps normal slots even once they are in the past, as the old query did', () => {
    const afterSeason = new Date(DEADLINE.getTime() + 10 * HOUR);
    const slots = [{ id: 'normal-past', startTime: at(HOUR) }];

    const { normal } = splitPublicTimeSlots(slots, afterSeason);

    expect(normal.map((s) => s.id)).toEqual(['normal-past']);
  });

  it('rehydrates JSON string startTimes into Dates and keeps other fields', () => {
    const iso = at(HOUR);
    const slots = [
      { id: 'a', startTime: iso, revealed: true, photoShooting: null },
    ];

    const [slot] = splitPublicTimeSlots(slots, now).normal;

    expect(slot.startTime).toBeInstanceOf(Date);
    expect(slot.startTime.toISOString()).toBe(iso);
    expect(slot).toMatchObject({
      id: 'a',
      revealed: true,
      photoShooting: null,
    });
  });

  it('preserves input order', () => {
    const slots = [
      { id: '1', startTime: at(HOUR) },
      { id: '2', startTime: at(2 * HOUR) },
      { id: '3', startTime: at(3 * HOUR) },
    ];

    expect(splitPublicTimeSlots(slots, now).normal.map((s) => s.id)).toEqual([
      '1',
      '2',
      '3',
    ]);
  });
});
