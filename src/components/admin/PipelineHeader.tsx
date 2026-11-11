import { countFormatter } from '@/lib/formatters';

export function PipelineHeader({
  inProgressCount,
  completedCount,
}: {
  inProgressCount: number;
  completedCount: number;
}) {
  return (
    <header className="flex items-center gap-4">
      <h1 className="sr-only">Pipeline</h1>

      <div className="flex h-full flex-col items-center gap-1 rounded-xl px-5 py-2.5 text-center">
        <span aria-hidden="true" className="text-lg">
          🚧
        </span>
        <span className="text-3xl leading-none font-extrabold lg:text-4xl">
          {countFormatter.format(inProgressCount)}
        </span>
        <span className="text-xs tracking-wider text-muted-foreground uppercase">
          Folyamatban
        </span>
      </div>

      <div className="flex flex-col items-center gap-1 rounded-xl bg-linear-to-b from-green-100 to-green-200 px-5 py-2.5 text-center dark:from-green-950 dark:to-green-900">
        <span aria-hidden="true" className="text-lg">
          🎉
        </span>
        <span className="text-3xl leading-none font-extrabold text-green-800 lg:text-4xl dark:text-green-200">
          {countFormatter.format(completedCount)}
        </span>
        <span className="text-xs tracking-wider text-green-700 uppercase dark:text-green-300">
          teljesített
        </span>
      </div>
    </header>
  );
}
