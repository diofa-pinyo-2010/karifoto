import Link from 'next/link';

import { ChevronRightIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item';
import {
  DecorSet,
  Package,
  PhotoShootingStatus,
} from '@/generated/prisma/client';
import { packages, photoShootingSets, type PackageKey } from '@/lib/data';
import { timeFormatter } from '@/lib/formatters';
import { fetchPhotoShootings } from '@/server/photo-shootings';
import { groupByDay } from '@/lib/utils';

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

const SHOOTING_STATUS_LABEL: Record<PhotoShootingStatus, string> = {
  PHOTOGRAPHER_SELECTION: 'Fotós kiválasztása',
  RAW_PHOTOS_UPLOAD: 'Nyers képek feltöltése',
  USER_SELECTION: 'Ügyfél válogatás',
  FINAL_PHOTOS_UPLOAD: 'Végleges képek feltöltése',
  COMPLETED: 'Teljesített',
  CLOSED: 'Bezárt',
};

export default async function BookingsPage() {
  const photoShootings = await fetchPhotoShootings();

  const groupedShootings = groupByDay(
    photoShootings,
    (ps) => ps.timeSlot.startTime,
  );

  return (
    <div className="mx-auto flex w-full flex-col gap-3 lg:w-3xl">
      <h1 className="text-lg font-semibold">Következő fotózások</h1>
      {photoShootings.map((shooting) => {
        return (
          <Item
            key={shooting.id}
            variant="outline"
            render={
              <Link href={`/admin/photo-shootings/${shooting.id}`}>
                <ItemContent className="gap-2">
                  <Badge>{SHOOTING_STATUS_LABEL[shooting.status]}</Badge>
                  <ItemTitle>
                    {timeFormatter.format(shooting.timeSlot.startTime)}{' '}
                    {shooting.client.owner.name} ({shooting.client.owner.email})
                  </ItemTitle>
                  <ItemDescription>
                    {` 
                        ${PACKAGE_LABEL[shooting.package]} 
                      • Dekor: ${shooting.decorSet ? DECOR_SET_LABEL[shooting.decorSet] : '-'}
                      • Fényjáték: ${shooting.package === 'FAMILY' ? 'IGEN' : shooting.isLightPlaySelected ? 'IGEN' : 'NEM'}
                      • ${shooting.numberOfGuests} fő
                      • ${shooting.numberOfPets} kedvenc
                      `}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <ChevronRightIcon className="size-4" />
                </ItemActions>
              </Link>
            }
          />
        );
      })}
    </div>
  );
}
