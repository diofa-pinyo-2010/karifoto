'use client';

import { useState, useTransition } from 'react';

import { ResponsiveDialog } from '@/components/ResponsiveDialog';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { createBookingIntentDiscount } from '@/server/price-adjustments';

export function AddPriceAdjustmentDialog({
  bookingIntentId,
  disabled,
}: {
  bookingIntentId: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setAmount('');
    setReason('');
    setError(null);
  }

  function handleSubmit() {
    const amountHuf = Number(amount);
    if (!amount || !Number.isInteger(amountHuf) || amountHuf <= 0) {
      setError('Add meg az összeget forintban.');
      return;
    }
    if (reason.trim().length < 2) {
      setError('Add meg a kedvezmény indoklását.');
      return;
    }

    startTransition(async () => {
      const result = await createBookingIntentDiscount(
        bookingIntentId,
        amountHuf,
        reason,
      );
      if ('error' in result) {
        setError(result.error);
        return;
      }

      setOpen(false);
      reset();
    });
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) reset();
      }}
      trigger={
        <Button size="lg" disabled={disabled}>
          Kedvezmény hozzáadása
        </Button>
      }
      title="Kedvezmény hozzáadása"
      description="Az összeg forintban értendő, és levonásra kerül a végösszegből."
    >
      <div className="flex flex-col gap-4">
        <Field>
          <FieldLabel htmlFor="price-adjustment-amount">Összeg (Ft)</FieldLabel>
          <Input
            id="price-adjustment-amount"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="price-adjustment-reason">Indoklás</FieldLabel>
          <Textarea
            id="price-adjustment-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>

        {error != null && <FieldError>{error}</FieldError>}

        <Button
          onClick={handleSubmit}
          disabled={pending}
          size="lg"
          className="w-full"
        >
          {pending ? <Spinner /> : 'Hozzáadás'}
        </Button>
      </div>
    </ResponsiveDialog>
  );
}
