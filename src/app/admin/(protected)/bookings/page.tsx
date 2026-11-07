import Link from 'next/link';

import {
  ChevronRightIcon,
  FaceSlightlyFrowningIcon,
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
import { Separator } from '@/components/ui/separator';
import { requiresDecorChoice } from '@/lib/catalog';
import {
  APP_URLS,
  buildStaffBadgeClassNames,
  DECOR_SET_LABEL,
  isLightPlayChargeable,
  PHOTO_SHOOTING_STATUS_BADGE_CLASSNAME,
  PHOTO_SHOOTING_STATUS_LABEL,
} from '@/lib/constants';
import { dateFormatter, timeFormatter } from '@/lib/formatters';
import { fetchUpcomingPhotoShootings } from '@/lib/queries';
import { groupByDay } from '@/lib/utils';
import { fetchStaffIdsForBadges } from '@/server/admin';

export default async function BookingsPage() {
  const [photoShootings, staffIds] = await Promise.all([
    fetchUpcomingPhotoShootings(),
    fetchStaffIdsForBadges(),
  ]);
  const staffBadgeClassNames = buildStaffBadgeClassNames(staffIds);

  const groupedShootings = groupByDay(
    photoShootings,
    (shooting) => shooting.timeSlot.startTime,
  );
  const days = Array.from(groupedShootings.entries());

  if (days.length === 0) {
    return (
      <div className="mt-7 flex items-center justify-center gap-2 rounded-[22px] border border-border bg-muted px-5 py-8 text-center text-sm text-muted-foreground">
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
        A következő fotózások
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
                  className="bg-card"
                  render={
                    <Link href={APP_URLS.photoShootingAdminPage(shooting.id)}>
                      <ItemContent className="gap-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={
                              PHOTO_SHOOTING_STATUS_BADGE_CLASSNAME[
                                shooting.status
                              ]
                            }
                          >
                            {PHOTO_SHOOTING_STATUS_LABEL[shooting.status].long}
                          </Badge>
                          {shooting.photographer && (
                            <Badge
                              variant="secondary"
                              className={
                                shooting.photographerId
                                  ? staffBadgeClassNames.get(
                                      shooting.photographerId,
                                    )
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
                            {timeFormatter.format(shooting.timeSlot.startTime)}{' '}
                            •{' '}
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
                            <p className="font-medium">
                              {shooting.numberOfGuests}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <PawPrintIcon className="size-4 text-muted-foreground" />
                            <p className="font-medium">
                              {shooting.numberOfPets}
                            </p>
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
            })}
            <Separator className="mt-4" />
          </div>
        );
      })}
    </div>
  );
}
