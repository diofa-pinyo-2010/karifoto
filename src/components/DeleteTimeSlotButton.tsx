'use client';

import { useState, useTransition } from 'react';

import { TrashIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
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
    startTransition(async () => {
      setLoading(true);
      await deleteTimeSlot(timeSlotId);
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
