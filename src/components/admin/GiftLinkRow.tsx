'use client';

import { CopyButton } from '@/components/admin/CopyButton';

export function GiftLinkRow({ url }: { url: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0">
      <span className="shrink-0 text-sm text-muted-foreground">
        Ajándék link
      </span>
      <span className="flex min-w-0 items-center gap-1 text-right text-sm font-medium">
        <span className="min-w-0 break-all">{url}</span>
        <CopyButton value={url} />
      </span>
    </div>
  );
}
