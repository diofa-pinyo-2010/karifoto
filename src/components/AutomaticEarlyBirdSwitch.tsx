'use client';

import { useOptimistic, useTransition } from 'react';

import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { setAutomaticEarlyBirdEnabled } from '@/server/site-settings';

export function AutomaticEarlyBirdSwitch({
  initial,
  id,
}: {
  initial: boolean;
  id: string;
}) {
  const [optimistic, setOptimistic] = useOptimistic(initial);
  const [isPending, startTransition] = useTransition();

  function toggle(next: boolean) {
    startTransition(async () => {
      setOptimistic(next);
      try {
        const res = await setAutomaticEarlyBirdEnabled(next);
        if ('error' in res) {
          toast.add({ title: res.error, type: 'error' });
          return;
        }
        toast.add({ title: 'Sikeres mentés!', type: 'success' });
      } catch {
        toast.add({ title: 'Hiba történt, próbáld újra.', type: 'error' });
      }
    });
  }

  return (
    <Switch
      id={id}
      checked={optimistic}
      onCheckedChange={(checked) => toggle(checked)}
      // temporarily disabled
      disabled={isPending || true}
    />
  );
}
