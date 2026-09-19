import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DecorSet, Package } from '@/generated/prisma/client';
import { packages, photoShootingSets, type PackageKey } from '@/lib/data';
import { shortFullDateFormatter } from '@/lib/formatters';
import { fetchPhotoShootings } from '@/server/photo-shootings';

const packageNameById = Object.fromEntries(
  packages.map((p) => [p.id, p.name]),
) as Record<PackageKey, string>;

const PACKAGE_LABEL: Record<Package, string> = {
  [Package.MINI]: packageNameById.mini,
  [Package.CLASSIC]: packageNameById.classic,
  [Package.FAMILY]: packageNameById.family,
};

const DECOR_SET_LABEL: Record<DecorSet, string> = {
  [DecorSet.HOFEHER]: photoShootingSets.hofeher.name,
  [DecorSet.ALOMKASTELY]: photoShootingSets.alomkastely.name,
};

export default async function BookingsPage() {
  const photoShootings = await fetchPhotoShootings();

  return (
    <div className="flex max-w-5xl flex-col gap-4 overflow-auto">
      <h1 className="text-lg font-semibold">Következő fotózások</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Időpont</TableHead>
            <TableHead>Ügyfél neve</TableHead>
            <TableHead>Telefonszám</TableHead>
            <TableHead>Csomag</TableHead>
            <TableHead>Díszlet</TableHead>
            <TableHead>Fényjáték</TableHead>
            <TableHead className="text-right">Műveletek</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {photoShootings.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center text-muted-foreground"
              >
                Nincs közelgő fotózás.
              </TableCell>
            </TableRow>
          )}
          {photoShootings.map((shooting) => (
            <TableRow key={shooting.id}>
              <TableCell>
                {shortFullDateFormatter.format(shooting.timeSlot.startTime)}
              </TableCell>
              <TableCell>{shooting.client.owner.name}</TableCell>
              <TableCell>{shooting.client.owner.phoneNumber}</TableCell>
              <TableCell>{PACKAGE_LABEL[shooting.package]}</TableCell>
              <TableCell>
                {shooting.decorSet ? DECOR_SET_LABEL[shooting.decorSet] : '—'}
              </TableCell>
              <TableCell>
                {shooting.isLightPlaySelected ? 'Igen' : 'Nem'}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="outline"
                  nativeButton={false}
                  render={
                    <Link href={`/admin/photo-shootings/${shooting.id}`} />
                  }
                >
                  Részletek
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
