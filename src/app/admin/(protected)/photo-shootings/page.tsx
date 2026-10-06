import Link from 'next/link';

import { FaceSlightlyFrowningIcon } from 'lucide-react';

import { ShootingListControls } from '@/components/admin/ShootingListControls';
import { Badge } from '@/components/ui/badge';
import { Item, ItemContent, ItemDescription } from '@/components/ui/item';
import {
  APP_URLS,
  PHOTO_SHOOTING_STATUS_BADGE_CLASSNAME,
  PHOTO_SHOOTING_STATUS_LABEL,
} from '@/lib/constants';
import { requireNavAccess } from '@/lib/dal';
import {
  dateTimeWithYearFormatter,
  formatSlotDateTime,
} from '@/lib/formatters';
import { fetchAllPhotoShootings } from '@/lib/queries';
import {
  parseShootingOrder,
  SHOOTING_ORDER_PARAM,
  SHOOTING_SEARCH_PARAM,
} from '@/lib/shooting-order';

export default async function AllPhotoShootingsPage({
  searchParams,
}: PageProps<'/admin/photo-shootings'>) {
  await requireNavAccess(APP_URLS.allShootings);

  const params = await searchParams;
  const rawSearch = params[SHOOTING_SEARCH_PARAM];
  const search = (Array.isArray(rawSearch) ? rawSearch[0] : rawSearch)?.trim();
  const order = parseShootingOrder(params[SHOOTING_ORDER_PARAM]);

  const shootings = await fetchAllPhotoShootings({
    search: search ?? '',
    order,
  });

  return (
    <div className="mx-auto flex w-full flex-col gap-4">
      <h1 className="text-lg font-semibold text-muted-foreground lg:text-2xl">
        Összes foglalás
      </h1>
      <ShootingListControls search={search ?? ''} order={order} />

      {shootings.length === 0 ? (
        <div className="flex items-center justify-center gap-2 rounded-[22px] border border-border bg-muted px-5 py-8 text-center text-sm text-muted-foreground">
          <FaceSlightlyFrowningIcon
            strokeWidth={2}
            className="size-5 shrink-0 opacity-60"
          />
          Nincs a keresésnek megfelelő foglalás.
        </div>
      ) : (
        shootings.map((shooting) => {
          const { owner } = shooting.client;
          return (
            <Item key={shooting.id} variant="outline" className="bg-card">
              <ItemContent className="gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={APP_URLS.photoShootingAdminPage(shooting.id)}
                    className="font-semibold underline-offset-4 hover:underline"
                  >
                    {formatSlotDateTime(shooting.timeSlot.startTime)}
                  </Link>
                  <Badge
                    variant="secondary"
                    className={
                      PHOTO_SHOOTING_STATUS_BADGE_CLASSNAME[shooting.status]
                    }
                  >
                    {PHOTO_SHOOTING_STATUS_LABEL[shooting.status]}
                  </Badge>
                </div>
                <ItemDescription>
                  {owner.name} •{' '}
                  <a
                    href={`tel:${owner.phoneNumber}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {owner.phoneNumber}
                  </a>
                </ItemDescription>
                <ItemDescription className="text-xs">
                  Foglalva:{' '}
                  {dateTimeWithYearFormatter.format(shooting.createdAt)}
                </ItemDescription>
              </ItemContent>
            </Item>
          );
        })
      )}
    </div>
  );
}
