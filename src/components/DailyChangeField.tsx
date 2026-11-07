'use client';

import { EditableField } from '@/components/EditableField';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { centsToHuf, formatMoney } from '@/lib/utils';
import { setDailyChange } from '@/server/site-settings';

function format(amount: string) {
  return amount === '' ? '' : amount.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function DailyChangeField({
  dailyChangeInCents,
}: {
  dailyChangeInCents: number;
}) {
  async function handleSave(amount: string | null) {
    const result = await setDailyChange(Number(amount || 0));
    if ('error' in result) return { error: result.error };
  }

  return (
    <EditableField<string>
      value={String(centsToHuf(dailyChangeInCents))}
      displayValue={formatMoney(dailyChangeInCents)}
      onSave={handleSave}
      renderInput={({ value, onChange }) => (
        <Field>
          <Input
            id="daily-change-amount"
            type="text"
            inputMode="numeric"
            value={format(value ?? '')}
            onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
            // oxlint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
        </Field>
      )}
    />
  );
}
