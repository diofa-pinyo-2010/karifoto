'use client';

import { useState, useTransition } from 'react';

import { BadgePercentIcon } from 'lucide-react';

import { ResponsiveDialog } from '@/components/ResponsiveDialog';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { PriceAdjustmentType } from '@/generated/prisma/enums';
import { PRICE_ADJUSTMENT_TYPE_LABEL } from '@/lib/constants';
import {
  createPriceAdjustment,
  type PriceAdjustmentTarget,
} from '@/server/price-adjustments';

function format(amount: string) {
  return amount === '' ? '' : amount.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function AddPriceAdjustmentDialog({
  target,
  defaultType,
  disabled,
  title,
  triggerLabel,
}: {
  target: PriceAdjustmentTarget;
  defaultType: PriceAdjustmentType;
  disabled?: boolean;
  title: string;
  triggerLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<PriceAdjustmentType>(defaultType);
  const [amount, setAmount] = useState('');
  const [publicLabel, setPublicLabel] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setType(defaultType);
    setAmount('');
    setPublicLabel('');
    setInternalNote('');
    setError(null);
  }

  function handleSubmit() {
    const amountHuf = Number(amount);
    if (!amount || !Number.isInteger(amountHuf) || amountHuf <= 0) {
      setError('Add meg az összeget forintban.');
      return;
    }
    if (publicLabel.trim().length < 2 || internalNote.trim().length < 2) {
      setError('Add meg a tétel publikus nevét és indoklását.');
      return;
    }

    startTransition(async () => {
      const result = await createPriceAdjustment({
        target,
        type,
        amountHuf,
        publicLabel,
        internalNote,
      });
      if ('error' in result) {
        setError(result.error);
        return;
      }

      setOpen(false);
      reset();
      toast.add({ title: `${PRICE_ADJUSTMENT_TYPE_LABEL[type]} hozzáadva!` });
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
        <Button size="lg" disabled={disabled} variant="secondary">
          <BadgePercentIcon />
          {triggerLabel}
        </Button>
      }
      title={title}
      description="Az összeg forintban értendő, és levonásra kerül a végösszegből."
    >
      <div className="flex flex-col gap-4">
        <FieldSet>
          <FieldLegend>Típus</FieldLegend>
          <RadioGroup
            value={type}
            onValueChange={(value) => setType(value as PriceAdjustmentType)}
          >
            {Object.values(PriceAdjustmentType).map((option) => (
              <FieldLabel
                key={option}
                htmlFor={`price-adjustment-type-${option}`}
              >
                <Field orientation="horizontal">
                  {PRICE_ADJUSTMENT_TYPE_LABEL[option]}
                  <RadioGroupItem
                    value={option}
                    id={`price-adjustment-type-${option}`}
                  />
                </Field>
              </FieldLabel>
            ))}
          </RadioGroup>
        </FieldSet>

        <Field>
          <FieldLabel htmlFor="price-adjustment-amount">Összeg (Ft)</FieldLabel>
          <Input
            id="price-adjustment-amount"
            type="text"
            inputMode="numeric"
            min={1}
            step={1}
            value={format(amount)}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="price-adjustment-public-label">
            Nyilvános megnevezés (pl. összesítőben megjelenhet)
          </FieldLabel>
          <Input
            type="text"
            id="price-adjustment-public-label"
            value={publicLabel}
            onChange={(event) => setPublicLabel(event.target.value)}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="price-adjustment-internal-note">
            Indoklás (csak admin)
          </FieldLabel>
          <Textarea
            id="price-adjustment-internal-note"
            value={internalNote}
            onChange={(event) => setInternalNote(event.target.value)}
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
