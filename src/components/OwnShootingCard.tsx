import Link from 'next/link';

import { ChevronRightIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  APP_URLS,
  PACKAGE_LABEL,
  PHOTO_SHOOTING_STATUS_BADGE_CLASSNAME,
  PHOTO_SHOOTING_STATUS_LABEL,
} from '@/lib/constants';
import { shortFullDateFormatter } from '@/lib/formatters';

import type { fetchOwnPhotoShootings } from '@/lib/queries';

type OwnShooting = Awaited<
  ReturnType<typeof fetchOwnPhotoShootings>
>['asPhotographer'][number];

export function OwnShootingCard({ shooting }: { shooting: OwnShooting }) {
  return (
    <Link
      href={APP_URLS.photoShootingAdminPage(shooting.id)}
      className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm text-muted-foreground">
          {shortFullDateFormatter.format(shooting.timeSlot.startTime)}
        </span>
        <span className="truncate font-medium">
          {shooting.client.owner.name}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-primary dark:text-primary-foreground">
            {PACKAGE_LABEL[shooting.package]}
          </span>
          <Badge
            variant="secondary"
            className={PHOTO_SHOOTING_STATUS_BADGE_CLASSNAME[shooting.status]}
          >
            {PHOTO_SHOOTING_STATUS_LABEL[shooting.status]}
          </Badge>
        </div>
      </div>
      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
