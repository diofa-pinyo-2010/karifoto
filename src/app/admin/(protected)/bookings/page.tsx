import Link from 'next/link';

import { ChevronRightIcon, FaceSlightlyFrowningIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item';
import { Separator } from '@/components/ui/separator';
import {
  DecorSet,
  Package,
  PhotoShootingStatus,
} from '@/generated/prisma/client';
import { packages, photoShootingSets, type PackageKey } from '@/lib/data';
import { dateFormatter, timeFormatter } from '@/lib/formatters';
import { groupByDay } from '@/lib/utils';
import { fetchPhotoShootings } from '@/server/photo-shootings';
import { UPCOMING_SHOOTINGS_TO_SHOW } from '@/lib/constants';

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
    (shooting) => shooting.timeSlot.startTime,
  );
  const days = Array.from(groupedShootings.entries());

  if (days.length === 0) {
    return (
      <div className="mt-7 flex items-center justify-center gap-2 rounded-[22px] border border-cream/12 bg-cream/4 px-5 py-8 text-center text-sm text-sage-soft">
        <FaceSlightlyFrowningIcon
          strokeWidth={2}
          className="size-5 shrink-0 opacity-60"
        />
        Jelenleg nincsenek foglalások.
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full flex-col gap-6 lg:w-3xl">
      <h1 className="text-lg font-semibold text-muted-foreground lg:text-2xl">
        A következő (max) {UPCOMING_SHOOTINGS_TO_SHOW} fotózás
      </h1>
      {days.map(([dayKey, dayPhotoShootings]) => {
        return (
          <div key={dayKey} className="flex flex-col gap-3">
            <h2 className="text-xl font-bold">
              {dateFormatter.format(dayPhotoShootings[0].timeSlot.startTime)}
            </h2>
            {dayPhotoShootings.map((shooting) => {
              return (
                <Item
                  key={shooting.id}
                  variant="outline"
                  render={
                    <Link href={`/admin/photo-shootings/${shooting.id}`}>
                      <ItemContent className="gap-2">
                        <Badge variant="secondary">
                          {SHOOTING_STATUS_LABEL[shooting.status]}
                        </Badge>
                        <ItemTitle>
                          {timeFormatter.format(shooting.timeSlot.startTime)}{' '}
                          {shooting.client.owner.name} (
                          {shooting.client.owner.email})
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
            <Separator className="mt-4" />
          </div>
        );
      })}
    </div>
  );
}
