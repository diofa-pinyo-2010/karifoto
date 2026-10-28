import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Package } from '@/generated/prisma/enums';
import { isLightPlayChargeable } from '@/lib/constants';

const MONEY_CARD_COUNT = 5;
const SHOOTING_ROW_COUNT = Object.values(Package).reduce(
  (sum, pkg) => sum + (isLightPlayChargeable(pkg) ? 2 : 1),
  0,
);

export default function StatsAdminLoading() {
  return (
    <div className="mx-auto flex w-full flex-col gap-6 lg:w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-muted-foreground lg:text-2xl">
            Statisztikák
          </h1>
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-7 w-24 rounded-lg" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: MONEY_CARD_COUNT }, (_, index) => (
          <Card key={index}>
            <CardHeader className="gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-56" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-16" />
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {Array.from({ length: SHOOTING_ROW_COUNT }, (_, index) => (
            <div key={index} className="flex items-center justify-between">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-7 w-8" />
            </div>
          ))}
          <Separator />
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-7 w-8" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
