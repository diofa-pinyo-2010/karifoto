import { PhotoShootingStatus } from '@/generated/prisma/enums';

export const PIPELINE_COLUMNS = [
  {
    title: 'Folyamatban',
    statuses: [
      PhotoShootingStatus.WAITING_FOR_BALANCE_PAYMENT,
      PhotoShootingStatus.RAW_PHOTOS_UPLOAD,
    ],
  },
  {
    title: 'Ügyfél válogatás',
    statuses: [PhotoShootingStatus.USER_SELECTION],
  },
  {
    title: 'Utómunka',
    statuses: [
      PhotoShootingStatus.EDITOR_SELECTION,
      PhotoShootingStatus.FINAL_PHOTOS_UPLOAD,
      PhotoShootingStatus.WAITING_FOR_EXTRA_PAYMENT,
    ],
  },
  {
    title: 'Zárható',
    statuses: [PhotoShootingStatus.READY_TO_COMPLETE],
  },
] as const satisfies readonly {
  title: string;
  statuses: readonly PhotoShootingStatus[];
}[];

export const PIPELINE_STATUSES: PhotoShootingStatus[] =
  PIPELINE_COLUMNS.flatMap((column) => column.statuses);

/**
 * Oszlopokba rendezi a fotózásokat, a bemenet sorrendjét megtartva. Ami
 * egyik oszlophoz sem tartozik, az kimarad.
 */
export function groupByPipelineColumn<
  T extends { status: PhotoShootingStatus },
>(shootings: readonly T[]) {
  return PIPELINE_COLUMNS.map((column) => ({
    title: column.title,
    shootings: shootings.filter((shooting) =>
      (column.statuses as readonly PhotoShootingStatus[]).includes(
        shooting.status,
      ),
    ),
  }));
}
