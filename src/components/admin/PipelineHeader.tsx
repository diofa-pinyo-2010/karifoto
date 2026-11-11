import { countFormatter } from '@/lib/formatters';

export function PipelineHeader({
  bookedCount,
  inProgressCount,
  completedCount,
}: {
  bookedCount: number;
  inProgressCount: number;
  completedCount: number;
}) {
  return (
    <header className="grid grid-cols-3 items-stretch gap-2 sm:flex sm:items-center sm:gap-4">
      <h1 className="sr-only">Pipeline</h1>

      <div className="flex h-full min-w-0 flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-center sm:px-5">
        <span aria-hidden="true" className="text-lg">
          📸
        </span>
        <span className="text-3xl leading-none font-extrabold lg:text-4xl">
          {countFormatter.format(bookedCount)}
        </span>
        <span className="text-xs tracking-normal text-muted-foreground uppercase sm:tracking-wider">
          Foglalt
        </span>
      </div>

      <div className="flex h-full min-w-0 flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-center sm:px-5">
        <span aria-hidden="true" className="text-lg">
          🚧
        </span>
        <span className="text-3xl leading-none font-extrabold lg:text-4xl">
          {countFormatter.format(inProgressCount)}
        </span>
        <span className="text-xs tracking-normal text-muted-foreground uppercase sm:tracking-wider">
          Folyamatban
        </span>
      </div>

      <div className="flex min-w-0 flex-col items-center gap-1 rounded-xl bg-linear-to-b from-green-100 to-green-200 px-2 py-2.5 text-center sm:px-5 dark:from-green-950 dark:to-green-900">
        <span aria-hidden="true" className="text-lg">
          🎉
        </span>
        <span className="text-3xl leading-none font-extrabold text-green-800 lg:text-4xl dark:text-green-200">
          {countFormatter.format(completedCount)}
        </span>
        <span className="text-xs tracking-normal text-green-700 uppercase sm:tracking-wider dark:text-green-300">
          teljesített
        </span>
      </div>
    </header>
  );
}
