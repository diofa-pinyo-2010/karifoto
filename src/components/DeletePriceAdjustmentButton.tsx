'use client';

import { useState, useTransition } from 'react';

import { TrashIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import {
  deletePriceAdjustment,
  type PriceAdjustmentTarget,
} from '@/server/price-adjustments';

export function DeletePriceAdjustmentButton({
  priceAdjustmentId,
  target,
}: {
  priceAdjustmentId: string;
  target: PriceAdjustmentTarget;
}) {
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  function handleDelete() {
    setLoading(true);
    startTransition(async () => {
      try {
        const result = await deletePriceAdjustment({
          id: priceAdjustmentId,
          target,
        });
        if (result != null && 'error' in result) {
          toast.add({ title: result.error, type: 'error' });
          return;
        }
        toast.add({ title: 'Tétel törölve!', type: 'success' });
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
