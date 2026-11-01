import { Badge } from '@/components/ui/badge';
import {
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
    <article className="flex flex-col gap-1.5 rounded-lg border bg-card p-3">
      <span className="truncate font-medium">{shooting.client.owner.name}</span>
      <span className="text-sm text-muted-foreground">
        {shortFullDateFormatter.format(shooting.timeSlot.startTime)} •{' '}
        {PACKAGE_LABEL[shooting.package]}
      </span>
      <Badge
        variant="secondary"
        className={PHOTO_SHOOTING_STATUS_BADGE_CLASSNAME[shooting.status]}
      >
        {PHOTO_SHOOTING_STATUS_LABEL[shooting.status]}
      </Badge>
    </article>
  );
}
