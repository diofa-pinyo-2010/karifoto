'use client';

import { BadgeQuestionMarkIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function AdjustmentNoteTooltip({ note }: { note: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button size="icon-sm" variant="ghost">
            <BadgeQuestionMarkIcon className="text-muted-foreground" />
          </Button>
        }
      />
      <TooltipContent>
        <p>{note}</p>
      </TooltipContent>
    </Tooltip>
  );
}
