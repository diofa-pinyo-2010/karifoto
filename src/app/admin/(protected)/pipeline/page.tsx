import { PipelineCard } from '@/components/admin/PipelineCard';
import { PipelineCarousel } from '@/components/admin/PipelineCarousel';
import { PipelineHeader } from '@/components/admin/PipelineHeader';
import { Badge } from '@/components/ui/badge';
import { APP_URLS, buildStaffBadgeClassNames } from '@/lib/constants';
import { requireNavAccess } from '@/lib/dal';
import { groupByPipelineColumn } from '@/lib/pipeline';
import {
  countCompletedPhotoShootings,
  fetchPipelinePhotoShootings,
} from '@/lib/queries';
import { fetchStaffIdsForBadges } from '@/server/admin';

export default async function PipelinePage() {
  await requireNavAccess(APP_URLS.pipeline);

  const [shootings, staffIds, completedCount] = await Promise.all([
    fetchPipelinePhotoShootings(),
    fetchStaffIdsForBadges(),
    countCompletedPhotoShootings(),
  ]);
  const staffBadgeClassNames = buildStaffBadgeClassNames(staffIds);
  const columns = groupByPipelineColumn(shootings);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PipelineHeader
        inProgressCount={shootings.length}
        completedCount={completedCount}
      />

      <PipelineCarousel>
        {columns.map((column) => (
          <section
            key={column.title}
            aria-label={column.title}
            className="flex flex-col gap-2 rounded-xl bg-muted/60 py-3 lg:h-[calc(100dvh-9.5rem)]"
          >
            <div className="flex items-center justify-between gap-2 px-3">
              <h2 className="font-medium">{column.title}</h2>
              <Badge variant="secondary" className="rounded-full">
                {column.shootings.length}
              </Badge>
            </div>

            <div className="flex scrollbar-thin flex-col gap-2 px-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              {column.shootings.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nincs fotózás
                </p>
              ) : (
                column.shootings.map((shooting) => (
                  <PipelineCard
                    key={shooting.id}
                    shooting={shooting}
                    staffBadgeClassNames={staffBadgeClassNames}
                  />
                ))
              )}
            </div>
          </section>
        ))}
      </PipelineCarousel>
    </div>
  );
}
