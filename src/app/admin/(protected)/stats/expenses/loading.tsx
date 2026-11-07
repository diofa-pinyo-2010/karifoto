import { Skeleton } from '@/components/ui/skeleton';

const ROW_COUNT = 8;

// Saját loading kell, különben a szülő /stats oldal kártyás skeletonja jelenne meg.
export default function StatsExpensesLoading() {
  return (
    <div className="mx-auto flex w-full flex-col gap-6 lg:w-3xl">
      <Skeleton className="h-8 w-20 rounded-lg" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-muted-foreground lg:text-2xl">
            Kiadások
          </h1>
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-7 w-24 rounded-lg" />
      </div>
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        {Array.from({ length: ROW_COUNT }, (_, index) => (
          <Skeleton key={index} className="h-5 w-full" />
        ))}
      </div>
    </div>
  );
}
