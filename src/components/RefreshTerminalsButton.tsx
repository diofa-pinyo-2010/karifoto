'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { RefreshCwIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

export function RefreshTerminalsButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
    >
      {pending ? <Spinner /> : <RefreshCwIcon />}
      Frissítés
    </Button>
  );
}
