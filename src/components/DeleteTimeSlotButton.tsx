'use client';

import { useState, useTransition } from 'react';

import { TrashIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { deleteTimeSlot } from '@/server/time-slots';

export function DeleteTimeSlotButton({
  timeSlotId,
  disabled,
}: {
  timeSlotId: string;
  disabled: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  function handleDelete() {
    setLoading(true);
    startTransition(async () => {
      try {
        const result = await deleteTimeSlot(timeSlotId);
        if (result != null && 'error' in result) {
          toast.add({ title: result.error, type: 'error' });
        }
      } finally {
        setLoading(false);
      }
    });
  }

  return (
    <Button
      variant="destructive"
      size="icon-lg"
      onClick={handleDelete}
      disabled={disabled}
    >
      {loading ? <Spinner /> : <TrashIcon />}
    </Button>
  );
}
