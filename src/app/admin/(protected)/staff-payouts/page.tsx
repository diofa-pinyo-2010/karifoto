import Link from 'next/link';

import { ExternalLinkIcon } from 'lucide-react';

import { RecordPayoutDialog } from '@/components/admin/staff-payouts/RecordPayoutDialog';
import { ReviewTapUrlField } from '@/components/admin/staff-payouts/ReviewTapUrlField';
import { StaffAccountTable } from '@/components/admin/staff-payouts/StaffAccountTable';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  APP_URLS,
  GOOGLE_REVIEW_LIST_URL,
  isLightPlayChargeable,
} from '@/lib/constants';
import { requireNavAccess } from '@/lib/dal';
import { dateTimeWithYearFormatter } from '@/lib/formatters';
import { prisma } from '@/lib/prisma';
import { fetchStaffPayoutTabs } from '@/lib/queries';
import { buildStaffAccount } from '@/lib/staff-ledger';
import { cn, formatMoney } from '@/lib/utils';
import { loadStaffLedger } from '@/server/load-staff-ledger';

export default async function StaffPayoutsPage({
  searchParams,
}: PageProps<'/admin/staff-payouts'>) {
  await requireNavAccess(APP_URLS.staffPayouts);

  const params = await searchParams;
  const requested = Array.isArray(params.staff)
    ? params.staff[0]
    : params.staff;

  const tabs = await fetchStaffPayoutTabs();
  const selected = tabs.find((tab) => tab.id === requested) ?? tabs[0];

  if (selected == null) {
    return (
      <p className="text-sm text-muted-foreground">
        Még nincs fotós vagy szerkesztő.
      </p>
    );
  }

  const ledger = await loadStaffLedger(prisma, selected.id);
  const account = buildStaffAccount(ledger.items, ledger.payouts);

  const tapLabels = Object.fromEntries(
    ledger.taps.map((tap) => [
      tap.id,
      `Tap ${dateTimeWithYearFormatter.format(tap.createdAt)} · ${tap.standLabel}`,
    ]),
  );
  const shootingLabels = Object.fromEntries(
    ledger.shootings.map((shooting) => [
      shooting.id,
      `${shooting.package}${isLightPlayChargeable(shooting.package) && shooting.isLightPlaySelected ? ' (+F)' : ''}${shooting.numberOfPets > 0 ? ` (${shooting.numberOfPets} kisállat)` : ''} · ${shooting.clientName} · ${dateTimeWithYearFormatter.format(shooting.startTime)}`,
    ]),
  );
  const bonusStateByTap = new Map(
    account.rows.flatMap((row) =>
      row.type === 'ITEM' && row.item.reviewTapId != null
        ? [[row.item.reviewTapId, row.state] as const]
        : [],
    ),
  );

  return (
    <div className="mx-auto flex w-full flex-col gap-6 lg:w-5xl">
      <h1 className="text-lg font-semibold text-muted-foreground lg:text-2xl">
        Staff kifizetések
      </h1>

      <nav className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`${APP_URLS.staffPayouts}?staff=${tab.id}`}
            className={cn(
              'rounded-full border px-3 py-1 text-sm tabular-nums',
              tab.id === selected.id
                ? 'border-foreground bg-foreground text-background'
                : 'hover:bg-muted',
            )}
          >
            {tab.nickname} · {formatMoney(tab.dueInCents)}
          </Link>
        ))}
      </nav>

      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">{selected.nickname}</h2>
        <RecordPayoutDialog
          key={selected.id}
          staffProfileId={selected.id}
          nickname={selected.nickname}
          dueInCents={account.dueInCents}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Esedékes</CardDescription>
            <CardTitle className="text-2xl font-black tabular-nums">
              {formatMoney(account.dueInCents)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            fotós {formatMoney(account.dueByCategory.EXPENSE_PHOTOGRAPHER_FEE)}{' '}
            · szerk. {formatMoney(account.dueByCategory.EXPENSE_EDITOR_FEE)} ·
            bónusz {formatMoney(account.dueByCategory.EXPENSE_STAFF_BONUS)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Összes kifizetés</CardDescription>
            <CardTitle className="text-2xl font-black tabular-nums">
              {formatMoney(account.paidTotalInCents)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            fotós {formatMoney(account.paidByCategory.EXPENSE_PHOTOGRAPHER_FEE)}{' '}
            · szerk. {formatMoney(account.paidByCategory.EXPENSE_EDITOR_FEE)} ·
            bónusz {formatMoney(account.paidByCategory.EXPENSE_STAFF_BONUS)}
          </CardContent>
        </Card>
      </div>

      <section className="flex flex-col gap-2">
        <h3 className="font-semibold">Folyószámla</h3>
        <StaffAccountTable
          rows={account.rows}
          labels={{ shootings: shootingLabels, taps: tapLabels }}
        />
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{selected.nickname} review tapjei</h3>
          <a
            href={GOOGLE_REVIEW_LIST_URL}
            className="flex items-center gap-1 text-xs text-blue-600 underline underline-offset-4 transition-colors hover:text-blue-500 dark:text-blue-300 hover:dark:text-blue-400"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>Google Reviews</span>
            <ExternalLinkIcon className="size-4" />
          </a>
        </div>
        {ledger.taps.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nincs review tap.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tap ideje</TableHead>
                <TableHead>Stand</TableHead>
                <TableHead>Review URL</TableHead>
                <TableHead className="text-right">Bónusz</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.taps.map((tap) => {
                const state = bonusStateByTap.get(tap.id);
                return (
                  <TableRow key={tap.id}>
                    <TableCell className="whitespace-nowrap">
                      {dateTimeWithYearFormatter.format(tap.createdAt)}
                    </TableCell>
                    <TableCell>{tap.standLabel}</TableCell>
                    <TableCell>
                      <ReviewTapUrlField
                        reviewTapId={tap.id}
                        reviewUrl={tap.reviewUrl}
                        reviewUrlSetAt={tap.reviewUrlSetAt}
                      />
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap tabular-nums">
                      {tap.bonusInCents == null ? (
                        '—'
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          {formatMoney(tap.bonusInCents)}
                          <Badge variant="secondary">
                            {state === 'PAID'
                              ? 'kifizetve'
                              : state === 'PARTIAL'
                                ? 'részben'
                                : 'esedékes'}
                          </Badge>
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
