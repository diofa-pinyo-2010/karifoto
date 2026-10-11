'use client';

import { useState, type ReactNode } from 'react';

import { MinusIcon, PlusIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface ItemsCollapsibleProps {
  title: string;
  content: ReactNode;
}
export function ItemsCollapsible({ title, content }: ItemsCollapsibleProps) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          'flex flex-col gap-3 rounded-lg border-2 border-dashed bg-card p-4',
          open && 'bg-transparent',
        )}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <CollapsibleTrigger
            render={
              <Button size="icon" variant="outline">
                {open ? <MinusIcon /> : <PlusIcon />}
              </Button>
            }
          />
        </div>
        <CollapsibleContent>{content}</CollapsibleContent>
      </div>
    </Collapsible>
  );
}
