import { PipelineCard } from '@/components/admin/PipelineCard';
import { PipelineHeader } from '@/components/admin/PipelineHeader';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { APP_URLS, buildStaffBadgeClassNames } from '@/lib/constants';
import { requireNavAccess } from '@/lib/dal';
import { groupByPipelineColumn } from '@/lib/pipeline';
import {
  countPhotoShootingTotals,
  fetchPipelinePhotoShootings,
} from '@/lib/queries';
import { fetchStaffIdsForBadges } from '@/server/admin';

export default async function PipelineTabs() {
  await requireNavAccess(APP_URLS.pipelineTabs);

  const [shootings, staffIds, totals] = await Promise.all([
    fetchPipelinePhotoShootings(),
    fetchStaffIdsForBadges(),
    countPhotoShootingTotals(),
  ]);
  const staffBadgeClassNames = buildStaffBadgeClassNames(staffIds);
  const columns = groupByPipelineColumn(shootings);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PipelineHeader
        bookedCount={totals.booked}
        inProgressCount={shootings.length}
        completedCount={totals.completed}
      />

      <Tabs defaultValue={0} className="gap-4">
        <div className="-mx-4 scrollbar-none overflow-x-auto px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          <TabsList className="h-9 w-max sm:min-w-full">
            {columns.map((column, index) => (
              <TabsTrigger
                key={column.title}
                value={index}
                className="px-2.5 after:hidden"
              >
                {column.title}
                <Badge variant="secondary" className="rounded-full">
                  {column.shootings.length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {columns.map((column, index) => (
          <TabsContent
            key={column.title}
            value={index}
            className="flex flex-col gap-2"
          >
            {column.shootings.length === 0 ? (
              <p className="rounded-lg bg-muted/60 py-8 text-center text-muted-foreground">
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
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
