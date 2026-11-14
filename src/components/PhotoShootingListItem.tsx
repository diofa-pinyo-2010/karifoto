import Link from 'next/link';

import {
  ChevronRightIcon,
  NotebookPenIcon,
  PawPrintIcon,
  UsersIcon,
  WandIcon,
} from 'lucide-react';

import { PhotographerBadgeSelect } from '@/components/PhotographerBadgeSelect';
import { Badge } from '@/components/ui/badge';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
} from '@/components/ui/item';
import { PhotoShootingStatus } from '@/generated/prisma/enums';
import { requiresDecorChoice } from '@/lib/catalog';
import {
  APP_URLS,
  DECOR_SET_LABEL,
  isLightPlayChargeable,
  PHOTO_SHOOTING_STATUS_BADGE_CLASSNAME,
  PHOTO_SHOOTING_STATUS_LABEL,
} from '@/lib/constants';
import { timeFormatter } from '@/lib/formatters';
import { cn } from '@/lib/utils';

import type { fetchUpcomingPhotoShootings } from '@/lib/queries';

type ListedPhotoShooting = Awaited<
  ReturnType<typeof fetchUpcomingPhotoShootings>
>[number];

export function PhotoShootingListItem({
  shooting,
  staffBadgeClassNames,
  photographers,
}: {
  shooting: ListedPhotoShooting;
  staffBadgeClassNames: Map<string, string>;
  photographers: { id: string; nickname: string }[];
}) {
  const isWaitingForBalancePayment =
    shooting.status === PhotoShootingStatus.WAITING_FOR_BALANCE_PAYMENT;

  return (
    <Item
      variant="outline"
      className={cn(
        // Kifeszített link: a Link ::after rétege fedi le az egész kártyát, így
        // a benne lévő gombok (fotós badge) nem kerülnek <a>-n belülre.
        'relative bg-card hover:bg-muted has-[a:focus-visible]:border-ring has-[a:focus-visible]:ring-[3px] has-[a:focus-visible]:ring-ring/50',
        isWaitingForBalancePayment &&
          'border-green-500 bg-green-50 hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900',
      )}
    >
      <ItemContent className="gap-2">
        <div className="flex items-center gap-2">
          {isWaitingForBalancePayment && (
            <span aria-hidden className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-green-500" />
            </span>
          )}
          <Badge
            variant="secondary"
            className={PHOTO_SHOOTING_STATUS_BADGE_CLASSNAME[shooting.status]}
          >
            {PHOTO_SHOOTING_STATUS_LABEL[shooting.status].long}
          </Badge>
        </div>
        <ItemTitle>
          <Link
            href={APP_URLS.photoShootingAdminPage(shooting.id)}
            className="outline-none after:absolute after:inset-0"
          >
            {/* <span className="text-muted-foreground">
                  #{shooting.sequenceNumber}
                </span>{' '} */}
            {timeFormatter.format(shooting.timeSlot.startTime)} •{' '}
            {shooting.client.owner.name}
          </Link>
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
          <span className="font-bold">
            {shooting.package}{' '}
            {requiresDecorChoice(shooting.package) &&
              shooting.decorSet &&
              `(${DECOR_SET_LABEL[shooting.decorSet]})`}
          </span>
          {isLightPlayChargeable(shooting.package) &&
            shooting.isLightPlaySelected && (
              <div className="flex items-center gap-1">
                <WandIcon className="size-4 text-muted-foreground" />
              </div>
            )}
          <PhotographerBadgeSelect
            shootingId={shooting.id}
            photographerId={shooting.photographerId}
            photographerNickname={shooting.photographer?.nickname ?? null}
            photographers={photographers}
            badgeClassName={
              shooting.photographerId
                ? staffBadgeClassNames.get(shooting.photographerId)
                : undefined
            }
            disabled={shooting.status === PhotoShootingStatus.COMPLETED}
          />
        </div>
      </ItemContent>
      <ItemActions>
        <ChevronRightIcon className="size-4" />
      </ItemActions>
    </Item>
  );
}
