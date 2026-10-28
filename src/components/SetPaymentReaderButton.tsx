'use client';

import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { setPaymentReader } from '@/server/sumup-readers';

export function SetPaymentReaderButton({ readerId }: { readerId: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await setPaymentReader(readerId);
      if ('error' in result) {
        toast.add({ title: result.error, type: 'error' });
      }
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="self-start"
      onClick={handleClick}
      disabled={pending}
    >
      {pending && <Spinner />}
      Legyen ez a fizetési terminál
    </Button>
  );
}
