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
import { toast } from '@/components/ui/toast';
import { LedgerEntryCategory, PaymentMethod } from '@/generated/prisma/enums';
import {
  LEDGER_ENTRY_CATEGORY_LABEL,
  PAYMENT_METHOD_LABEL,
} from '@/lib/constants';
import { recordExpense } from '@/server/expenses';

type ExpenseCategory = Parameters<typeof recordExpense>[0]['category'];

const CATEGORIES: ExpenseCategory[] = [
  LedgerEntryCategory.EXPENSE_EQUIPMENT,
  LedgerEntryCategory.EXPENSE_RENT,
  LedgerEntryCategory.EXPENSE_SOFTWARE,
  LedgerEntryCategory.EXPENSE_OTHER,
];

function format(amount: string) {
  return amount === '' ? '' : amount.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function RecordExpenseDialog() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>(
    LedgerEntryCategory.EXPENSE_OTHER,
  );
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.TRANSFER);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setCategory(LedgerEntryCategory.EXPENSE_OTHER);
    setDescription('');
    setAmount('');
    setMethod(PaymentMethod.TRANSFER);
    setError(null);
  }

  function handleSubmit() {
    if (!description.trim()) {
      setError('Add meg, mire ment a kiadás.');
      return;
    }
    const amountHuf = Number(amount);
    if (!amount || !Number.isInteger(amountHuf) || amountHuf <= 0) {
      setError('Add meg az összeget forintban.');
      return;
    }

    startTransition(async () => {
      const result = await recordExpense({
        category,
        description,
        amountHuf,
        method,
      });
      if ('error' in result) {
        setError(result.error);
        return;
      }

      setOpen(false);
      toast.add({ title: 'Kiadás rögzítve' });
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
        <Button size="sm">
          <PlusIcon />
          Új kiadás
        </Button>
      }
      title="Új kiadás"
      description="Mai dátummal kerül a listába. Staff kifizetést a Staff kifizetések oldalon rögzíts."
    >
      <div className="flex flex-col gap-4">
        <Field>
          <FieldLabel htmlFor="expense-description">Leírás</FieldLabel>
          <Input
            id="expense-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="expense-amount">Összeg (Ft)</FieldLabel>
          <Input
            id="expense-amount"
            type="text"
            inputMode="numeric"
            value={format(amount)}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
          />
        </Field>

        <FieldSet>
          <FieldLegend>Kategória</FieldLegend>
          <RadioGroup
            value={category}
            onValueChange={(value) => setCategory(value as ExpenseCategory)}
          >
            {CATEGORIES.map((value) => (
              <FieldLabel key={value} htmlFor={`expense-category-${value}`}>
                <Field orientation="horizontal">
                  {LEDGER_ENTRY_CATEGORY_LABEL[value]}
                  <RadioGroupItem
                    value={value}
                    id={`expense-category-${value}`}
                  />
                </Field>
              </FieldLabel>
            ))}
          </RadioGroup>
        </FieldSet>

        <FieldSet>
          <FieldLegend>Mód</FieldLegend>
          <RadioGroup
            value={method}
            onValueChange={(value) => setMethod(value as PaymentMethod)}
          >
            {Object.values(PaymentMethod).map((value) => (
              <FieldLabel key={value} htmlFor={`expense-method-${value}`}>
                <Field orientation="horizontal">
                  {PAYMENT_METHOD_LABEL[value]}
                  <RadioGroupItem
                    value={value}
                    id={`expense-method-${value}`}
                  />
                </Field>
              </FieldLabel>
            ))}
          </RadioGroup>
        </FieldSet>

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
