import Link from 'next/link';

import { RecordExpenseDialog } from '@/components/admin/stats/RecordExpenseDialog';
import { RefreshStatsButton } from '@/components/RefreshStatsButton';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PAYMENT_METHOD_LABEL } from '@/lib/constants';
import { requireNavAccess } from '@/lib/dal';
import { dateTimeWithYearFormatter } from '@/lib/formatters';
import { getAdminStats } from '@/lib/queries';
import { formatMoney } from '@/lib/utils';

export default async function StatsExpensesPage() {
  await requireNavAccess('/admin/stats');
  const stats = await getAdminStats();

  return (
    <div className="mx-auto flex w-full flex-col gap-6 lg:w-3xl">
      <Button
        variant="outline"
        nativeButton={false}
        className="self-start"
        render={<Link href="/admin/stats">Vissza</Link>}
      />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-muted-foreground lg:text-2xl">
            Kiadások
          </h1>
          <p className="text-3xl font-black tabular-nums">
            {formatMoney(stats.expenses)}
          </p>
          <p className="text-xs text-muted-foreground">
            Utolsó szinkron:{' '}
            {dateTimeWithYearFormatter.format(new Date(stats.syncedAt))}
          </p>
        </div>
        <div className="flex gap-2">
          <RecordExpenseDialog />
          <RefreshStatsButton />
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dátum</TableHead>
              <TableHead>Leírás</TableHead>
              <TableHead>Mód</TableHead>
              <TableHead className="text-right">Összeg</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.expenseItems.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  Még nincs kiadás.
                </TableCell>
              </TableRow>
            )}
            {stats.expenseItems.map((item) => (
              <TableRow key={item.key}>
                <TableCell>
                  {dateTimeWithYearFormatter.format(new Date(item.date))}
                </TableCell>
                <TableCell className="whitespace-normal">
                  {item.description}
                </TableCell>
                <TableCell>{PAYMENT_METHOD_LABEL[item.method]}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(item.amountInCents)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
