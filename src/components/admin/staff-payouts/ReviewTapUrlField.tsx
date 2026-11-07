'use client';

import { ExternalLinkIcon } from 'lucide-react';

import { EditableTextField } from '@/components/EditableTextField';
import { dateTimeWithYearFormatter } from '@/lib/formatters';
import { setReviewTapUrl } from '@/server/staff-payouts';

/**
 * Egyszer tölthető: üresen szerkeszthető, kitöltve csak egy link — a
 * kifizetett bónusz alapja a felületről nem írható át.
 */
export function ReviewTapUrlField({
  reviewTapId,
  reviewUrl,
  reviewUrlSetAt,
}: {
  reviewTapId: string;
  reviewUrl: string | null;
  reviewUrlSetAt: Date | null;
}) {
  if (reviewUrl != null) {
    return (
      <span className="inline-flex flex-wrap items-center gap-x-2">
        <a
          href={reviewUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex max-w-64 items-center gap-1 truncate text-blue-700 underline underline-offset-2 dark:text-blue-400"
        >
          <span className="truncate">{reviewUrl}</span>
          <ExternalLinkIcon className="size-3 shrink-0" />
        </a>
        {reviewUrlSetAt && (
          <span className="text-xs text-muted-foreground">
            {dateTimeWithYearFormatter.format(reviewUrlSetAt)}
          </span>
        )}
      </span>
    );
  }

  return (
    <EditableTextField
      value={null}
      placeholder="Review URL beillesztése…"
      onSave={async (value) => {
        const result = await setReviewTapUrl(reviewTapId, value);
        if ('error' in result) return result;
      }}
    />
  );
}
