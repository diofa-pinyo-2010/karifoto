import Link from 'next/link';

import { PACKAGE_LABEL } from '@/lib/constants';
import { shortDateFormatter, timeFormatter } from '@/lib/formatters';
import { capitalize, cn } from '@/lib/utils';

import type { TimeSlotPublic } from '@/lib/queries';

// Szept. 13. 12:00
const formatSlotLabel = (date: Date) =>
  `${capitalize(shortDateFormatter.format(date))} ${timeFormatter.format(date)}`;

const rowClass =
  'flex min-h-13 items-center justify-between gap-3 rounded-md border px-3 py-3 text-[11px]';

export function TimeSlotItem({
  slot: { id, startTime, revealed, photoShooting, allowedPackages },
  selectionQuery,
}: {
  slot: TimeSlotPublic;
  selectionQuery: string;
}) {
  const taken = !revealed || photoShooting != null;

  const row = (
    <>
      <span className={cn(taken && 'line-through')}>
        {formatSlotLabel(startTime)}
      </span>
      {allowedPackages.length > 0 && !taken && (
        <span className="font-medium">
          Csak {allowedPackages.map((p) => PACKAGE_LABEL[p]).join(', ')}
        </span>
      )}
      <span
        className={cn(
          'text-[10px] font-semibold uppercase',
          taken ? 'text-brand-taken' : 'text-brand-free',
        )}
      >
        {taken ? 'Foglalt' : 'Szabad'}
      </span>
    </>
  );

  return (
    <li>
      {taken ? (
        <div
          aria-disabled
          className={cn(
            rowClass,
            'cursor-not-allowed border-brand-taken-edge bg-brand-taken-surface text-brand-taken',
          )}
        >
          {row}
        </div>
      ) : (
        <Link
          href={`/foglalas/${id}${selectionQuery}`}
          className={cn(
            rowClass,
            'border-brand-free-edge bg-brand-free-surface transition-colors hover:border-brand-free-edge-hover hover:bg-brand-free-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ad7135]',
          )}
        >
          {row}
        </Link>
      )}
    </li>
  );
}
