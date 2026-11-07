import { FaceSlightlyFrowningIcon } from 'lucide-react';

import { PhotoShootingListItem } from '@/components/PhotoShootingListItem';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { APP_URLS, buildStaffBadgeClassNames } from '@/lib/constants';
import { summarizeDailyIncome } from '@/lib/daily-income';
import { requireNavAccess } from '@/lib/dal';
import { dateFormatter } from '@/lib/formatters';
import {
  fetchTodayLedgerEntries,
  fetchTodayPhotoShootings,
  getSiteSettings,
} from '@/lib/queries';
import { formatMoney } from '@/lib/utils';
import { fetchStaffIdsForBadges } from '@/server/admin';

export default async function TodayPage() {
  await requireNavAccess(APP_URLS.today);

  const [photoShootings, ledgerEntries, { dailyChangeInCents }, staffIds] =
    await Promise.all([
      fetchTodayPhotoShootings(),
      fetchTodayLedgerEntries(),
      getSiteSettings(),
      fetchStaffIdsForBadges(),
    ]);
  const staffBadgeClassNames = buildStaffBadgeClassNames(staffIds);
  const income = summarizeDailyIncome(ledgerEntries, dailyChangeInCents);

  const moneyCards = [
    {
      title: 'Mai bevétel',
      amount: income.total,
      description: 'A stúdióban ma átvett hátralékok.',
    },
    {
      title: 'Bankkártyás bevétel',
      amount: income.card,
      description: 'Terminálon fizetve.',
    },
    {
      title: 'Készpénzes bevétel',
      amount: income.cash,
      description: (
        <>
          <p>Váltó: {formatMoney(dailyChangeInCents)}</p>
          <p className="font-semibold text-foreground">
            Brifkó: {formatMoney(income.cashBox)}
          </p>
        </>
      ),
    },
  ];

  return (
    <div className="mx-auto flex w-full flex-col gap-6 lg:w-3xl">
      <h1 className="text-lg font-semibold text-muted-foreground lg:text-2xl">
        Mai nap – {dateFormatter.format(new Date())}
      </h1>

      <div className="grid gap-4 sm:grid-cols-3">
        {moneyCards.map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardDescription>{card.title}</CardDescription>
              <CardTitle className="text-2xl font-black tabular-nums">
                {formatMoney(card.amount)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {card.description}
            </CardContent>
          </Card>
        ))}
      </div>

      {photoShootings.length === 0 ? (
        <div className="flex items-center justify-center gap-2 rounded-[22px] border border-border bg-muted px-5 py-8 text-center text-sm text-muted-foreground">
          <FaceSlightlyFrowningIcon
            strokeWidth={2}
            className="size-5 shrink-0 opacity-60"
          />
          Ma nincs fotózás.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {photoShootings.map((shooting) => (
            <PhotoShootingListItem
              key={shooting.id}
              shooting={shooting}
              staffBadgeClassNames={staffBadgeClassNames}
            />
          ))}
        </div>
      )}
    </div>
  );
}
