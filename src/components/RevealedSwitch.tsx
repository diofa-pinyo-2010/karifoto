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
  const [, startTransition] = useTransition();

  function toggle() {
    const next = !optimistic;
    startTransition(async () => {
      setOptimistic(next);
      await updateTimeSlotRevealed(timeSlotId, next);
    });
  }

  return (
    <Switch
      disabled={disabled}
      checked={optimistic}
      aria-label="reveal switch"
      onClick={toggle}
    />
  );
}
