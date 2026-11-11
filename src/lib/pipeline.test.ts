import { describe, expect, it } from 'vitest';

import { PhotoShootingStatus } from '@/generated/prisma/enums';
import { groupByPipelineColumn, PIPELINE_COLUMNS } from '@/lib/pipeline';

function shooting(status: PhotoShootingStatus, id = '') {
  return { id, status };
}

function idsByTitle(columns: { title: string; shootings: { id: string }[] }[]) {
  return columns.map((column) => ({
    title: column.title,
    ids: column.shootings.map(({ id }) => id),
  }));
}

describe('groupByPipelineColumn', () => {
  it('puts each pipeline status into its column', () => {
    const columns = groupByPipelineColumn([
      shooting(PhotoShootingStatus.WAITING_FOR_BALANCE_PAYMENT, 'a'),
      shooting(PhotoShootingStatus.RAW_PHOTOS_UPLOAD, 'b'),
      shooting(PhotoShootingStatus.USER_SELECTION, 'c'),
      shooting(PhotoShootingStatus.EDITOR_SELECTION, 'd'),
      shooting(PhotoShootingStatus.FINAL_PHOTOS_UPLOAD, 'e'),
      shooting(PhotoShootingStatus.WAITING_FOR_EXTRA_PAYMENT, 'f'),
      shooting(PhotoShootingStatus.READY_TO_COMPLETE, 'g'),
    ]);

    expect(idsByTitle(columns)).toEqual([
      { title: 'Fotó & Fizetés', ids: ['a'] },
      { title: 'Képfeltöltés', ids: ['b'] },
      { title: 'Ügyfél válogatás', ids: ['c'] },
      { title: 'Utómunka', ids: ['d', 'e', 'f'] },
      { title: 'Zárható', ids: ['g'] },
    ]);
  });

  it('drops statuses outside the pipeline', () => {
    const columns = groupByPipelineColumn([
      shooting(PhotoShootingStatus.PHOTOGRAPHER_SELECTION, 'a'),
      shooting(PhotoShootingStatus.WAITING_FOR_THE_DATE, 'b'),
      shooting(PhotoShootingStatus.COMPLETED, 'c'),
      shooting(PhotoShootingStatus.CANCELLED, 'd'),
    ]);

    expect(columns.every((column) => column.shootings.length === 0)).toBe(true);
  });

  it('keeps the input order within a status column', () => {
    const columns = groupByPipelineColumn([
      shooting(PhotoShootingStatus.EDITOR_SELECTION, 'later'),
      shooting(PhotoShootingStatus.FINAL_PHOTOS_UPLOAD, 'earlier'),
    ]);

    expect(columns[3].shootings.map(({ id }) => id)).toEqual([
      'later',
      'earlier',
    ]);
  });

  it('assigns no status to more than one column', () => {
    const all = PIPELINE_COLUMNS.flatMap((column) => column.statuses);
    expect(new Set(all).size).toBe(all.length);
  });
});
