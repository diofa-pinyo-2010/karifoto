'use client';

import { useState, useTransition } from 'react';

import { PlusIcon } from 'lucide-react';

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
import { PaymentMethod } from '@/generated/prisma/enums';
import { formatMoney } from '@/lib/utils';
import { recordStaffPayout } from '@/server/staff-payouts';

type PayoutMethod = typeof PaymentMethod.CASH | typeof PaymentMethod.TRANSFER;

const METHODS: { value: PayoutMethod; label: string }[] = [
  { value: PaymentMethod.CASH, label: 'Készpénz' },
  { value: PaymentMethod.TRANSFER, label: 'Utalás' },
];

function format(amount: string) {
  return amount === '' ? '' : amount.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function RecordPayoutDialog({
  staffProfileId,
  nickname,
  dueInCents,
}: {
  staffProfileId: string;
  nickname: string;
  dueInCents: number;
}) {
  const payableHuf = String(Math.max(0, Math.floor(dueInCents / 100)));

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(payableHuf);
  const [method, setMethod] = useState<PayoutMethod>(PaymentMethod.CASH);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setAmount(payableHuf);
    setMethod(PaymentMethod.CASH);
    setNote('');
    setError(null);
  }

  function handleSubmit() {
    const amountHuf = Number(amount);
    if (!amount || !Number.isInteger(amountHuf) || amountHuf <= 0) {
      setError('Add meg az összeget forintban.');
      return;
    }

    startTransition(async () => {
      const result = await recordStaffPayout({
        staffProfileId,
        amountHuf,
        method,
        note: note.trim() || null,
      });
      if ('error' in result) {
        setError(result.error);
        return;
      }

      setOpen(false);
      toast.add({ title: `Kifizetés rögzítve: ${nickname}` });
    });
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) reset();
      }}
      trigger={
        <Button size="lg" disabled={dueInCents <= 0}>
          <PlusIcon />
          Kifizetés rögzítése
        </Button>
      }
      title={`Kifizetés – ${nickname}`}
      description={`Esedékes: ${formatMoney(Math.max(0, dueInCents))}. Az összeget a legrégebbi tételektől kezdve osztjuk szét.`}
    >
      <div className="flex flex-col gap-4">
        <Field>
          <FieldLabel htmlFor="staff-payout-amount">Összeg (Ft)</FieldLabel>
          <Input
            id="staff-payout-amount"
            type="text"
            inputMode="numeric"
            value={format(amount)}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
          />
        </Field>

        <FieldSet>
          <FieldLegend>Mód</FieldLegend>
          <RadioGroup
            value={method}
            onValueChange={(value) => setMethod(value as PayoutMethod)}
          >
            {METHODS.map((option) => (
              <FieldLabel
                key={option.value}
                htmlFor={`staff-payout-method-${option.value}`}
              >
                <Field orientation="horizontal">
                  {option.label}
                  <RadioGroupItem
                    value={option.value}
                    id={`staff-payout-method-${option.value}`}
                  />
                </Field>
              </FieldLabel>
            ))}
          </RadioGroup>
        </FieldSet>

        <Field>
          <FieldLabel htmlFor="staff-payout-note">
            Megjegyzés (opcionális)
          </FieldLabel>
          <Textarea
            id="staff-payout-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>

        {error != null && <FieldError>{error}</FieldError>}

        <Button
          onClick={handleSubmit}
          disabled={pending}
          size="lg"
          className="w-full"
        >
          {pending && <Spinner />}
          Rögzítés
        </Button>
      </div>
    </ResponsiveDialog>
  );
}
