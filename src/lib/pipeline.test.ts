import { describe, expect, it } from 'vitest';

import { PhotoShootingStatus } from '@/generated/prisma/enums';
import { groupByPipelineColumn, PIPELINE_COLUMNS } from '@/lib/pipeline';

describe('groupByPipelineColumn', () => {
  it('puts each pipeline status into its column', () => {
    const shootings = [
      { id: 'a', status: PhotoShootingStatus.WAITING_FOR_BALANCE_PAYMENT },
      { id: 'b', status: PhotoShootingStatus.RAW_PHOTOS_UPLOAD },
      { id: 'c', status: PhotoShootingStatus.USER_SELECTION },
      { id: 'd', status: PhotoShootingStatus.EDITOR_SELECTION },
      { id: 'e', status: PhotoShootingStatus.FINAL_PHOTOS_UPLOAD },
      { id: 'f', status: PhotoShootingStatus.WAITING_FOR_EXTRA_PAYMENT },
      { id: 'g', status: PhotoShootingStatus.READY_TO_COMPLETE },
    ];

    const columns = groupByPipelineColumn(shootings);

    expect(
      columns.map((column) => ({
        title: column.title,
        ids: column.shootings.map(({ id }) => id),
      })),
    ).toEqual([
      { title: 'Folyamatban', ids: ['a', 'b'] },
      { title: 'Ügyfél válogatás', ids: ['c'] },
      { title: 'Utómunka', ids: ['d', 'e', 'f'] },
      { title: 'Zárható', ids: ['g'] },
    ]);
  });

  it('drops statuses outside the pipeline', () => {
    const columns = groupByPipelineColumn([
      { status: PhotoShootingStatus.PHOTOGRAPHER_SELECTION },
      { status: PhotoShootingStatus.WAITING_FOR_THE_DATE },
      { status: PhotoShootingStatus.COMPLETED },
      { status: PhotoShootingStatus.CANCELLED },
    ]);

    expect(columns.every((column) => column.shootings.length === 0)).toBe(true);
  });

  it('keeps the input order within a column', () => {
    const columns = groupByPipelineColumn([
      { id: 'later', status: PhotoShootingStatus.RAW_PHOTOS_UPLOAD },
      {
        id: 'earlier',
        status: PhotoShootingStatus.WAITING_FOR_BALANCE_PAYMENT,
      },
    ]);

    expect(columns[0].shootings.map(({ id }) => id)).toEqual([
      'later',
      'earlier',
    ]);
  });

  it('assigns no status to more than one column', () => {
    const all = PIPELINE_COLUMNS.flatMap((column) => column.statuses);
    expect(new Set(all).size).toBe(all.length);
  });
});
