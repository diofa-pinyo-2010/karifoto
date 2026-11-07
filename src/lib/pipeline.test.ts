import { describe, expect, it } from 'vitest';

import { PhotoShootingStatus } from '@/generated/prisma/enums';
import {
  groupByPipelineColumn,
  PIPELINE_COLUMNS,
  TODAY_STATUSES,
} from '@/lib/pipeline';

// 2026-12-10 12:00 Budapest (CET, UTC+1)
const NOW = new Date('2026-12-10T11:00:00Z');
const TOMORROW = new Date('2026-12-11T09:00:00Z');

function shooting(status: PhotoShootingStatus, id = '', startTime = TOMORROW) {
  return { id, status, timeSlot: { startTime } };
}

function idsByTitle(columns: { title: string; shootings: { id: string }[] }[]) {
  return columns.map((column) => ({
    title: column.title,
    ids: column.shootings.map(({ id }) => id),
  }));
}

describe('groupByPipelineColumn', () => {
  it('puts each pipeline status into its column', () => {
    const columns = groupByPipelineColumn(
      [
        shooting(PhotoShootingStatus.WAITING_FOR_BALANCE_PAYMENT, 'a'),
        shooting(PhotoShootingStatus.RAW_PHOTOS_UPLOAD, 'b'),
        shooting(PhotoShootingStatus.USER_SELECTION, 'c'),
        shooting(PhotoShootingStatus.EDITOR_SELECTION, 'd'),
        shooting(PhotoShootingStatus.FINAL_PHOTOS_UPLOAD, 'e'),
        shooting(PhotoShootingStatus.WAITING_FOR_EXTRA_PAYMENT, 'f'),
        shooting(PhotoShootingStatus.READY_TO_COMPLETE, 'g'),
      ],
      NOW,
    );

    expect(idsByTitle(columns)).toEqual([
      { title: 'Mai fotózások', ids: [] },
      { title: 'Fotózás alatt', ids: ['a'] },
      { title: 'Képfeltöltés', ids: ['b'] },
      { title: 'Ügyfél válogatás', ids: ['c'] },
      { title: 'Utómunka', ids: ['d', 'e', 'f'] },
      { title: 'Zárható', ids: ['g'] },
    ]);
  });

  it("lists today's not-yet-started shootings first, by start time", () => {
    const columns = groupByPipelineColumn(
      [
        shooting(
          PhotoShootingStatus.WAITING_FOR_THE_DATE,
          'late',
          new Date('2026-12-10T16:00:00Z'),
        ),
        shooting(
          PhotoShootingStatus.PHOTOGRAPHER_SELECTION,
          'no-photographer',
          new Date('2026-12-10T13:00:00Z'),
        ),
        // 00:30 Budapest — still today, though the UTC date is yesterday
        shooting(
          PhotoShootingStatus.WAITING_FOR_THE_DATE,
          'just-after-midnight',
          new Date('2026-12-09T23:30:00Z'),
        ),
      ],
      NOW,
    );

    expect(columns[0].shootings.map(({ id }) => id)).toEqual([
      'just-after-midnight',
      'no-photographer',
      'late',
    ]);
  });

  it('leaves not-yet-started shootings of other days out', () => {
    const columns = groupByPipelineColumn(
      [
        shooting(PhotoShootingStatus.WAITING_FOR_THE_DATE, 'tomorrow'),
        // 23:30 Budapest the day before
        shooting(
          PhotoShootingStatus.PHOTOGRAPHER_SELECTION,
          'yesterday',
          new Date('2026-12-09T22:30:00Z'),
        ),
      ],
      NOW,
    );

    expect(columns.every((column) => column.shootings.length === 0)).toBe(true);
  });

  it('drops statuses outside the pipeline', () => {
    const columns = groupByPipelineColumn(
      [
        shooting(PhotoShootingStatus.COMPLETED, 'a', NOW),
        shooting(PhotoShootingStatus.CANCELLED, 'b', NOW),
      ],
      NOW,
    );

    expect(columns.every((column) => column.shootings.length === 0)).toBe(true);
  });

  it('keeps the input order within a status column', () => {
    const columns = groupByPipelineColumn(
      [
        shooting(PhotoShootingStatus.EDITOR_SELECTION, 'later'),
        shooting(PhotoShootingStatus.FINAL_PHOTOS_UPLOAD, 'earlier'),
      ],
      NOW,
    );

    expect(columns[4].shootings.map(({ id }) => id)).toEqual([
      'later',
      'earlier',
    ]);
  });

  it('assigns no status to more than one column', () => {
    const all = [
      ...TODAY_STATUSES,
      ...PIPELINE_COLUMNS.flatMap((column) => column.statuses),
    ];
    expect(new Set(all).size).toBe(all.length);
  });
});
