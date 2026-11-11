import { countFormatter } from '@/lib/formatters';

// A pipeline oldalak fejléce: a folyamatban lévő fotózások száma, mellette
// ünnepi kártyán a valaha lezártaké — erre büszkék vagyunk, ezért kiemelt.
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

      <div>
        <p className="text-xs tracking-wider text-muted-foreground uppercase">
          Folyamatban
        </p>
        <p className="text-3xl leading-none font-bold lg:text-4xl">
          {countFormatter.format(inProgressCount)}
        </p>
      </div>

      <div className="flex flex-col items-center rounded-xl bg-linear-to-b from-green-100 to-green-200 px-5 py-2.5 text-center dark:from-green-950 dark:to-green-900">
        <span aria-hidden="true" className="text-lg">
          🎉
        </span>
        <span className="text-3xl leading-none font-extrabold text-green-800 lg:text-4xl dark:text-green-200">
          {countFormatter.format(completedCount)}
        </span>
        <span className="text-xs text-green-700 dark:text-green-300">
          teljesített fotózás
        </span>
      </div>
    </header>
  );
}
