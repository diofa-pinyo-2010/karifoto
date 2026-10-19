import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

const SECTION_ROW_COUNTS = [3, 2, 5, 4];

export default function PhotoShootingDetailLoading() {
  return (
    <div className="mx-auto flex w-full flex-col gap-10 lg:w-3xl">
      <Skeleton className="h-10 w-56" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-11 w-36 rounded-lg" />
        <Skeleton className="h-9 w-64 lg:h-10" />
        <Skeleton className="h-7 w-80" />
      </div>

      {SECTION_ROW_COUNTS.map((rowCount, sectionIndex) => (
        <div key={sectionIndex} className="flex flex-col gap-10">
          {sectionIndex > 0 && <Separator />}
          <div className="flex flex-col gap-3">
            <Skeleton className="h-7 w-48" />
            <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
              {Array.from({ length: rowCount }, (_, rowIndex) => (
                <div
                  key={rowIndex}
                  className="flex items-center justify-between gap-4"
                >
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-40" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
