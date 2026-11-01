import Link from 'next/link';

import { ArrowRightIcon, CameraIcon, WandSparklesIcon } from 'lucide-react';

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

export function PipelineCard({ shooting }: { shooting: PipelineShooting }) {
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
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span className="flex items-center gap-1" title="Fotós">
          <CameraIcon aria-label="Fotós" className="size-3.5 shrink-0" />
          {shooting.photographer?.nickname ?? '???'}
        </span>
        <span className="flex items-center gap-1" title="Szerkesztő">
          <WandSparklesIcon
            aria-label="Szerkesztő"
            className="size-3.5 shrink-0"
          />
          {shooting.editor?.nickname ?? '???'}
        </span>
      </div>
    </article>
  );
}
