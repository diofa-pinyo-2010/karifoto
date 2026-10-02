'use client';

import { useOptimistic, useTransition } from 'react';

import { Switch } from '@/components/ui/switch';
import { updateTimeSlotRevealed } from '@/server/time-slots';

export function RevealedSwitch({
  timeSlotId,
  revealed,
  disabled,
}: {
  timeSlotId: string;
  revealed: boolean;
  disabled: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(revealed);
  const [isPending, startTransition] = useTransition();

  function toggle(next: boolean) {
    startTransition(async () => {
      setOptimistic(next);
      await updateTimeSlotRevealed(timeSlotId, next);
    });
  }

  return (
    <Switch
      disabled={disabled || isPending}
      checked={optimistic}
      aria-label="reveal switch"
      onCheckedChange={(checked) => toggle(checked)}
    />
  );
}
