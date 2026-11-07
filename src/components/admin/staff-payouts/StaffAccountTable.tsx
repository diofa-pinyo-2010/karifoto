'use client';

import Link from 'next/link';
import { Fragment, useState } from 'react';

import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PaymentMethod } from '@/generated/prisma/enums';
import { APP_URLS } from '@/lib/constants';
import { dateTimeWithYearFormatter } from '@/lib/formatters';
import { formatMoney } from '@/lib/utils';

import type { AccountRow, DueItem } from '@/lib/staff-ledger';

type Labels = {
  /** photoShootingId → „Ügyfél · időpont” */
  shootings: Record<string, string>;
  /** reviewTapId → „Tap <dátum> · <stand>” */
  taps: Record<string, string>;
};

const ITEM_LABEL: Record<DueItem['kind'], string> = {
  PHOTOGRAPHER_FEE: 'Fotós díj',
  EDITOR_FEE: 'Szerkesztői díj',
  REVIEW_BONUS: 'Review bónusz',
};

const CATEGORY_LABEL: Record<string, string> = {
  EXPENSE_PHOTOGRAPHER_FEE: ITEM_LABEL.PHOTOGRAPHER_FEE,
  EXPENSE_EDITOR_FEE: ITEM_LABEL.EDITOR_FEE,
  EXPENSE_STAFF_BONUS: ITEM_LABEL.REVIEW_BONUS,
};

const METHOD_LABEL: Partial<Record<PaymentMethod, string>> = {
  [PaymentMethod.CASH]: 'Készpénz',
  [PaymentMethod.TRANSFER]: 'Utalás',
};

function Reference({
  photoShootingId,
  reviewTapId,
  labels,
}: {
  photoShootingId: string | null;
  reviewTapId: string | null;
  labels: Labels;
}) {
  if (photoShootingId != null) {
    return (
      <Link
        href={APP_URLS.photoShootingAdminPage(photoShootingId)}
        className="underline-offset-2 hover:underline"
      >
        {labels.shootings[photoShootingId] ?? 'Fotózás'}
      </Link>
    );
  }
  if (reviewTapId != null) {
    return <>{labels.taps[reviewTapId] ?? 'Review tap'}</>;
  }
  return <>–</>;
}

export function StaffAccountTable({
  rows,
  labels,
}: {
  rows: AccountRow[];
  labels: Labels;
}) {
  const [openPayoutIds, setOpenPayoutIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setOpenPayoutIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Még nincs esedékes tétel.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Dátum</TableHead>
          <TableHead>Tétel</TableHead>
          <TableHead>Kapcsolódik</TableHead>
          <TableHead className="text-right">Összeg</TableHead>
          <TableHead className="text-right">Egyenleg</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          if (row.type === 'ITEM') {
            const { item } = row;
            return (
              <TableRow key={`item-${item.key}`}>
                <TableCell className="whitespace-nowrap">
                  {dateTimeWithYearFormatter.format(row.at)}
                </TableCell>
                <TableCell className="space-x-1">
                  <Badge variant="outline">{ITEM_LABEL[item.kind]}</Badge>
                  {row.state === 'PAID' && (
                    <Badge variant="secondary">kifizetve</Badge>
                  )}
                  {row.state === 'PARTIAL' && (
                    <Badge variant="secondary">
                      részben ({formatMoney(row.paidInCents)})
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Reference
                    photoShootingId={item.photoShootingId}
                    reviewTapId={item.reviewTapId}
                    labels={labels}
                  />
                </TableCell>
                <TableCell className="text-right text-green-700 tabular-nums dark:text-green-400">
                  +{formatMoney(item.amountInCents)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(row.balanceAfter)}
                </TableCell>
              </TableRow>
            );
          }

          const { payout } = row;
          const isOpen = openPayoutIds.has(payout.id);
          return (
            <Fragment key={`payout-${payout.id}`}>
              <TableRow
                className="cursor-pointer bg-muted/50 font-medium"
                onClick={() => toggle(payout.id)}
              >
                <TableCell className="whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">
                    {isOpen ? (
                      <ChevronDownIcon className="size-4" />
                    ) : (
                      <ChevronRightIcon className="size-4" />
                    )}
                    {dateTimeWithYearFormatter.format(row.at)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge>
                    Kifizetés · {METHOD_LABEL[payout.method] ?? payout.method}
                  </Badge>
                </TableCell>
                <TableCell>
                  {payout.ledgerEntries.length} tétel
                  {payout.note && (
                    <span className="text-muted-foreground">
                      {' '}
                      · {payout.note}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right text-red-700 tabular-nums dark:text-red-400">
                  −{formatMoney(payout.amountInCents)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(row.balanceAfter)}
                </TableCell>
              </TableRow>
              {isOpen &&
                payout.ledgerEntries.map((entry, index) => (
                  <TableRow
                    key={`payout-${payout.id}-${index}`}
                    className="bg-muted/20 text-xs"
                  >
                    <TableCell />
                    <TableCell className="pl-6">
                      {CATEGORY_LABEL[entry.category] ?? entry.category}
                    </TableCell>
                    <TableCell>
                      <Reference
                        photoShootingId={entry.photoShootingId}
                        reviewTapId={entry.reviewTapId}
                        labels={labels}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(-entry.amountInCents)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                ))}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
