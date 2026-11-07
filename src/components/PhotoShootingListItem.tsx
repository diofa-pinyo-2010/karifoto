import Link from 'next/link';

import {
  ChevronRightIcon,
  NotebookPenIcon,
  PawPrintIcon,
  UsersIcon,
  WandIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
} from '@/components/ui/item';
import { requiresDecorChoice } from '@/lib/catalog';
import {
  APP_URLS,
  DECOR_SET_LABEL,
  isLightPlayChargeable,
  PHOTO_SHOOTING_STATUS_BADGE_CLASSNAME,
  PHOTO_SHOOTING_STATUS_LABEL,
} from '@/lib/constants';
import { timeFormatter } from '@/lib/formatters';

import type { fetchUpcomingPhotoShootings } from '@/lib/queries';

type ListedPhotoShooting = Awaited<
  ReturnType<typeof fetchUpcomingPhotoShootings>
>[number];

export function PhotoShootingListItem({
  shooting,
  staffBadgeClassNames,
}: {
  shooting: ListedPhotoShooting;
  staffBadgeClassNames: Map<string, string>;
}) {
  return (
    <Item
      variant="outline"
      className="bg-card"
      render={
        <Link href={APP_URLS.photoShootingAdminPage(shooting.id)}>
          <ItemContent className="gap-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={
                  PHOTO_SHOOTING_STATUS_BADGE_CLASSNAME[shooting.status]
                }
              >
                {PHOTO_SHOOTING_STATUS_LABEL[shooting.status].long}
              </Badge>
              {shooting.photographer && (
                <Badge
                  variant="secondary"
                  className={
                    shooting.photographerId
                      ? staffBadgeClassNames.get(shooting.photographerId)
                      : undefined
                  }
                >
                  {shooting.photographer.nickname}
                </Badge>
              )}
            </div>
            <ItemTitle>
              <div>
                <span className="text-muted-foreground">
                  #{shooting.sequenceNumber}
                </span>{' '}
                {timeFormatter.format(shooting.timeSlot.startTime)} •{' '}
                <span className="text-primary dark:text-primary-foreground">
                  {shooting.package}
                  {requiresDecorChoice(shooting.package) &&
                    shooting.decorSet &&
                    `(${DECOR_SET_LABEL[shooting.decorSet]})`}
                </span>{' '}
                • {shooting.client.owner.name}
              </div>
            </ItemTitle>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex items-center gap-1">
                <UsersIcon className="size-4 text-muted-foreground" />
                <p className="font-medium">{shooting.numberOfGuests}</p>
              </div>
              <div className="flex items-center gap-1">
                <PawPrintIcon className="size-4 text-muted-foreground" />
                <p className="font-medium">{shooting.numberOfPets}</p>
              </div>
              {shooting.clientNote != null && (
                <div className="flex items-center gap-1">
                  <NotebookPenIcon className="size-4 text-muted-foreground" />
                </div>
              )}
              {isLightPlayChargeable(shooting.package) &&
                shooting.isLightPlaySelected && (
                  <div className="flex items-center gap-1">
                    <WandIcon className="size-4 text-muted-foreground" />
                  </div>
                )}
            </div>
          </ItemContent>
          <ItemActions>
            <ChevronRightIcon className="size-4" />
          </ItemActions>
        </Link>
      }
    />
  );
}
