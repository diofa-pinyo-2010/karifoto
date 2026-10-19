import { RefreshStatsButton } from '@/components/RefreshStatsButton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { requireNavAccess } from '@/lib/dal';
import { dateTimeWithYearFormatter } from '@/lib/formatters';
import { getAdminStats } from '@/lib/queries';
import { cn, formatMoney } from '@/lib/utils';

export default async function StatsAdminPage() {
  await requireNavAccess('/admin/stats');
  const stats = await getAdminStats();

  const moneyCards = [
    {
      title: 'Várható bevétel',
      amount: stats.expectedIncome,
      description:
        stats.missingPricingCount > 0
          ? `Nem lemondott fotózások. ${stats.missingPricingCount} db-hoz nincs Pricing object.`
          : 'Összes számlázandó összeg, lemondottak nélkül.',
      estimated: true,
    },
    {
      title: 'Realizált bevétel',
      amount: stats.income,
      description: 'Beérkezett pénzek',
      estimated: false,
    },
    {
      title: 'Várható profit',
      amount: stats.expectedProfit,
      description: 'Várható bevétel mínusz kiadások',
      estimated: true,
    },
    {
      title: 'Profit',
      amount: stats.profit,
      description: 'Realizált bevétel mínusz kiadások',
      estimated: false,
    },
    {
      title: 'Kiadások',
      amount: stats.expenses,
      description: 'Minden kiadás: fotós, bérleti díj, terminál, Stripe, stb.',
      estimated: false,
    },
  ];

  return (
    <div className="mx-auto flex w-full flex-col gap-6 lg:w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-muted-foreground lg:text-2xl">
            Statisztikák
          </h1>
          <p className="text-xs text-muted-foreground">
            Utolsó szinkron:{' '}
            {dateTimeWithYearFormatter.format(new Date(stats.syncedAt))}
          </p>
        </div>
        <RefreshStatsButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {moneyCards.map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardDescription>{card.title}</CardDescription>
              <CardTitle
                className={cn(
                  'text-2xl font-black tabular-nums',
                  card.amount < 0 && 'text-destructive',
                  card.estimated && 'font-bold text-brand-muted',
                )}
              >
                {formatMoney(card.amount)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {card.description}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardDescription>Fotózások</CardDescription>
          <CardTitle className="text-3xl font-black tabular-nums">
            {stats.shootings.total}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {stats.shootings.rows.map((row) => (
            <div key={row.key} className="flex items-center justify-between">
              <span>{row.label}</span>
              <span className="text-lg font-bold tabular-nums">
                {row.count}
              </span>
            </div>
          ))}
          <Separator />
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Lemondott</span>
            <span className="text-lg font-bold tabular-nums">
              {stats.shootings.cancelled}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
