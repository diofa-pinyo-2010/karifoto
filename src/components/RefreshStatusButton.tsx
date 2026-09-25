'use client';

import { useTransition } from 'react';

import { RotateCwIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type RefreshStatusButtonProps = {
  action: () => Promise<{ error: string } | void>;
};

export function RefreshStatusButton({ action }: RefreshStatusButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await action();
      if (result?.error) {
        console.error(result.error);
      }
    });
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size="icon-lg"
            variant="outline"
            disabled={isPending}
            onClick={handleClick}
          >
            <RotateCwIcon className={isPending ? 'animate-spin' : undefined} />
          </Button>
        }
      />
      <TooltipContent>
        <p>Státusz frissítése</p>
      </TooltipContent>
    </Tooltip>
  );
}
