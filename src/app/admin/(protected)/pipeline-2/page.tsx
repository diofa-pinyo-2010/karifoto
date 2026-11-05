import { PipelineCard } from '@/components/admin/PipelineCard';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { APP_URLS } from '@/lib/constants';
import { requireNavAccess } from '@/lib/dal';
import { groupByPipelineColumn } from '@/lib/pipeline';
import { fetchPipelinePhotoShootings } from '@/lib/queries';

export default async function Pipeline2Page() {
  await requireNavAccess(APP_URLS.pipeline2);

  const shootings = await fetchPipelinePhotoShootings();
  const columns = groupByPipelineColumn(shootings);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-lg font-semibold text-muted-foreground lg:text-2xl">
        Pipeline ({shootings.length} fotózás)
      </h1>

      <Tabs defaultValue={0} className="gap-4">
        <div className="-mx-4 scrollbar-none overflow-x-auto px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          <TabsList className="h-9 w-max sm:w-full">
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
                <PipelineCard key={shooting.id} shooting={shooting} />
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
