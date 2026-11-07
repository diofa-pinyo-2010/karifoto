import Link from 'next/link';

import { ArrowRightIcon, CameraIcon, WandSparklesIcon } from 'lucide-react';

import { DeadlineBadge } from '@/components/admin/DeadlineBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  APP_URLS,
  PACKAGE_LABEL,
  PHOTO_SHOOTING_STATUS_BADGE_CLASSNAME,
  PHOTO_SHOOTING_STATUS_LABEL,
} from '@/lib/constants';
import { shortFullDateFormatter } from '@/lib/formatters';

import type { fetchPipelinePhotoShootings } from '@/lib/queries';

type PipelineShooting = Awaited<
  ReturnType<typeof fetchPipelinePhotoShootings>
>[number];

export function PipelineCard({
  shooting,
  staffBadgeClassNames,
}: {
  shooting: PipelineShooting;
  staffBadgeClassNames: Map<string, string>;
}) {
  return (
    <article className="relative flex flex-col gap-1.5 rounded-lg border bg-card p-3">
      <span className="truncate font-medium">{shooting.client.owner.name}</span>
      <Button
        size="icon-lg"
        className="absolute top-3 right-3 rounded-xl"
        variant="secondary"
        nativeButton={false}
        render={<Link href={APP_URLS.photoShootingAdminPage(shooting.id)} />}
        aria-label="Fotózás megnyitása"
      >
        <ArrowRightIcon />
      </Button>
      <span className="text-sm text-muted-foreground">
        {shortFullDateFormatter.format(shooting.timeSlot.startTime)} •{' '}
        {PACKAGE_LABEL[shooting.package]}
      </span>
      <Badge
        variant="secondary"
        className={PHOTO_SHOOTING_STATUS_BADGE_CLASSNAME[shooting.status]}
      >
        {PHOTO_SHOOTING_STATUS_LABEL[shooting.status].short}
      </Badge>
      <DeadlineBadge {...shooting} />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge
          variant="secondary"
          className={
            shooting.photographerId
              ? staffBadgeClassNames.get(shooting.photographerId)
              : undefined
          }
          title="Fotós"
        >
          <CameraIcon aria-label="Fotós" />
          {shooting.photographer?.nickname ?? '???'}
        </Badge>
        <Badge
          variant="secondary"
          className={
            shooting.editorId
              ? staffBadgeClassNames.get(shooting.editorId)
              : undefined
          }
          title="Szerkesztő"
        >
          <WandSparklesIcon aria-label="Szerkesztő" />
          {shooting.editor?.nickname ?? '???'}
        </Badge>
      </div>
    </article>
  );
}
