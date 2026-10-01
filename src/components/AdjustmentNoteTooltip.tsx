'use client';

import { BadgeQuestionMarkIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function AdjustmentNoteTooltip({
  note,
  nickname,
}: {
  note: string;
  nickname: string;
}) {
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
        <p>
          {nickname}: {note}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
