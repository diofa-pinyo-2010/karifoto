import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

// Mirrors page.tsx: same grid, same columns, so nothing jumps when the
// real page streams in. Keep the two in sync when the layout changes.
const SECTION_ROW_COUNTS = [2, 5, 4, 6];

function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
      {Array.from({ length: count }, (_, rowIndex) => (
        <div key={rowIndex} className="flex items-center justify-between gap-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-40" />
        </div>
      ))}
    </div>
  );
}

export default function PhotoShootingDetailLoading() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-10">
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-28" />
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <div className="flex flex-col gap-1 lg:col-start-1 lg:row-start-1">
          <Skeleton className="mb-2 h-11 w-40 rounded-lg lg:h-13" />
          <Skeleton className="h-9 w-64 lg:h-10" />
          <Skeleton className="h-7 w-80 lg:h-8" />
        </div>

        <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
        </div>

        <div className="flex min-w-0 flex-col gap-10 lg:col-start-1 lg:row-start-2">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-9 w-44" />
            <SkeletonRows count={4} />
          </div>

          {SECTION_ROW_COUNTS.map((rowCount, sectionIndex) => (
            <div key={sectionIndex} className="flex flex-col gap-10">
              <Separator />
              <div className="flex flex-col gap-3">
                <Skeleton className="h-7 w-48" />
                <SkeletonRows count={rowCount} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
