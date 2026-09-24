'use client';

import { useState, useTransition } from 'react';

import { TrashIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { deletePriceAdjustment } from '@/server/price-adjustments';

export function DeletePriceAdjustmentButton({
  priceAdjustmentId,
  bookingIntentId,
}: {
  priceAdjustmentId: string;
  bookingIntentId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  function handleDelete() {
    setLoading(true);
    startTransition(async () => {
      try {
        const result = await deletePriceAdjustment(
          priceAdjustmentId,
          bookingIntentId,
        );
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
      size="icon-sm"
      onClick={handleDelete}
      disabled={loading}
    >
      {loading ? <Spinner /> : <TrashIcon />}
    </Button>
  );
}
