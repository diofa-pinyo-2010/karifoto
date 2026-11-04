import Link from 'next/link';

import { CheckIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PhotoShootingStatus } from '@/generated/prisma/enums';
import {
  APP_URLS,
  isLightPlayChargeable,
  PACKAGE_LABEL,
  PHOTO_SHOOTING_STATUS_BADGE_CLASSNAME,
  PHOTO_SHOOTING_STATUS_LABEL,
} from '@/lib/constants';
import { shortFullDateFormatter } from '@/lib/formatters';
import { fetchOwnPhotoShootingsWithFees } from '@/lib/queries';
import { cn, formatMoney } from '@/lib/utils';

const EMPTY = <span className="text-muted-foreground">—</span>;

const Check = () => <CheckIcon className="mx-auto size-4 text-green-600" />;

function formatFee(cents: number | null) {
  return cents == null ? EMPTY : formatMoney(cents);
}

export default async function MyTasksDetailsPage() {
  const { staffProfileId, rows } = await fetchOwnPhotoShootingsWithFees();

  const totals = rows.reduce(
    (sum, { fees }) => ({
      photographer: sum.photographer + (fees.photographerFeeInCents ?? 0),
      editor: sum.editor + (fees.editorFeeInCents ?? 0),
      total: sum.total + fees.totalInCents,
    }),
    { photographer: 0, editor: 0, total: 0 },
  );

  // ✓ ha én vagyok, különben a kolléga beceneve.
  const renderAssignee = (
    id: string | null,
    assignee: { nickname: string } | null,
  ) => {
    if (id === staffProfileId) return <Check />;
    return assignee?.nickname ?? EMPTY;
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6">
      <Button
        variant="outline"
        nativeButton={false}
        className="lg:self-start"
        render={<Link href={APP_URLS.ownShootings}>Vissza</Link>}
      />
      <h1 className="text-lg font-semibold text-muted-foreground lg:text-2xl">
        Minden hozzám tartozó fotózás
      </h1>
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Időpont</TableHead>
              <TableHead>Státusz</TableHead>
              <TableHead>Ügyfél</TableHead>
              <TableHead>Csomag</TableHead>
              <TableHead className="text-center">Fényjáték</TableHead>
              <TableHead className="text-right">Kisállat</TableHead>
              <TableHead className="text-center">Fotós</TableHead>
              <TableHead className="text-center">Szerkesztő</TableHead>
              <TableHead className="text-right">Fotós díj</TableHead>
              <TableHead className="text-right">Szerkesztő díj</TableHead>
              <TableHead className="text-right">Összesen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ shooting, fees }) => (
              <TableRow
                key={shooting.id}
                className={cn(
                  shooting.status === PhotoShootingStatus.CANCELLED &&
                    'line-through opacity-50',
                )}
              >
                <TableCell>
                  <Link
                    href={APP_URLS.photoShootingAdminPage(shooting.id)}
                    className="text-blue-600 underline underline-offset-4 transition-colors hover:text-blue-500 dark:text-blue-300 hover:dark:text-blue-400"
                  >
                    {shortFullDateFormatter.format(shooting.timeSlot.startTime)}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={
                      PHOTO_SHOOTING_STATUS_BADGE_CLASSNAME[shooting.status]
                    }
                  >
                    {PHOTO_SHOOTING_STATUS_LABEL[shooting.status].short}
                  </Badge>
                </TableCell>
                <TableCell>{shooting.client.owner.name}</TableCell>
                <TableCell>{PACKAGE_LABEL[shooting.package]}</TableCell>
                <TableCell className="text-center">
                  {isLightPlayChargeable(shooting.package) &&
                  shooting.isLightPlaySelected ? (
                    <Check />
                  ) : (
                    EMPTY
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {shooting.numberOfPets}
                </TableCell>
                <TableCell className="text-center">
                  {renderAssignee(
                    shooting.photographerId,
                    shooting.photographer,
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {renderAssignee(shooting.editorId, shooting.editor)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatFee(fees.photographerFeeInCents)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatFee(fees.editorFeeInCents)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatMoney(fees.totalInCents)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={8}>Összesen</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(totals.photographer)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(totals.editor)}
              </TableCell>
              <TableCell className="text-right font-bold tabular-nums">
                {formatMoney(totals.total)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}
