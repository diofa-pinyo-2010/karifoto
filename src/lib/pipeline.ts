import { PhotoShootingStatus } from '@/generated/prisma/enums';
import { dayBounds } from '@/lib/utils';

export const PIPELINE_COLUMNS = [
  {
    title: 'Fotózás alatt',
    statuses: [PhotoShootingStatus.WAITING_FOR_BALANCE_PAYMENT],
  },
  {
    title: 'Képfeltöltés',
    statuses: [PhotoShootingStatus.RAW_PHOTOS_UPLOAD],
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

// A mai, még el nem kezdődött fotózások. Ezt nem a státusz, hanem a nap dönti
// el, ezért nincs a PIPELINE_COLUMNS között. A fotós nélkülieket is mutatja,
// hogy a hiányzó fotós még aznap feltűnjön.
const TODAY_COLUMN_TITLE = 'Mai fotózások';
export const TODAY_STATUSES: PhotoShootingStatus[] = [
  PhotoShootingStatus.PHOTOGRAPHER_SELECTION,
  PhotoShootingStatus.WAITING_FOR_THE_DATE,
];

/**
 * Oszlopokba rendezi a fotózásokat. Elöl a mai fotózások kezdési idő szerint,
 * utána a státusz-oszlopok a bemenet sorrendjét megtartva. Ami egyik oszlophoz
 * sem tartozik, az kimarad.
 */
export function groupByPipelineColumn<
  T extends { status: PhotoShootingStatus; timeSlot: { startTime: Date } },
>(shootings: readonly T[], now = new Date()) {
  const today = dayBounds(now);
  const todayShootings = shootings
    .filter(
      (shooting) =>
        TODAY_STATUSES.includes(shooting.status) &&
        shooting.timeSlot.startTime >= today.start &&
        shooting.timeSlot.startTime < today.end,
    )
    .sort(
      (a, b) => a.timeSlot.startTime.getTime() - b.timeSlot.startTime.getTime(),
    );

  return [
    { title: TODAY_COLUMN_TITLE, shootings: todayShootings },
    ...PIPELINE_COLUMNS.map((column) => ({
      title: column.title,
      shootings: shootings.filter((shooting) =>
        (column.statuses as readonly PhotoShootingStatus[]).includes(
          shooting.status,
        ),
      ),
    })),
  ];
}
