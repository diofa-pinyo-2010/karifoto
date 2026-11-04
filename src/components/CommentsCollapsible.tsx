'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export function CommentsCollapsible({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    setOpen(window.matchMedia('(min-width: 64rem)').matches);
  }, []);

  return (
    <Collapsible open={open ?? true} onOpenChange={setOpen}>
      <CollapsibleTrigger
        nativeButton={false}
        render={
          <div className="flex cursor-pointer items-center justify-between rounded-lg px-4 pt-4 pb-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />
        }
      >
        <h3 id="comments-title" className="text-lg font-medium">
          Megjegyzések
        </h3>
        <Badge variant="secondary" className="rounded-full">
          {count}
        </Badge>
      </CollapsibleTrigger>
      <CollapsibleContent
        keepMounted
        className={cn(open === null && 'max-lg:hidden')}
      >
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
