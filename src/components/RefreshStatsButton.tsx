'use client';

import { useTransition } from 'react';

import { RefreshCwIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { refreshAdminStats } from '@/server/admin-stats';

export function RefreshStatsButton() {
  const [pending, startTransition] = useTransition();

  function handleRefresh() {
    startTransition(async () => {
      const result = await refreshAdminStats();
      if ('error' in result) {
        toast.add({ title: result.error, type: 'error' });
      }
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={pending}
    >
      {pending ? <Spinner /> : <RefreshCwIcon />}
      Frissítés
    </Button>
  );
}
