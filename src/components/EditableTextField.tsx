'use client';

import { EditableField } from '@/components/EditableField';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

type EditableTextFieldProps = {
  value: string | null;
  placeholder?: string;
  emptyLabel?: string;
  displayValue?: React.ReactNode;
  onSave: (value: string | null) => Promise<{ error: string } | void>;
};

export function EditableTextField({
  value,
  placeholder,
  emptyLabel = '-',
  displayValue,
  onSave,
}: EditableTextFieldProps) {
  return (
    <EditableField<string>
      value={value}
      displayValue={displayValue ?? value ?? emptyLabel}
      onSave={(text) => onSave(text?.trim() || null)}
      renderInput={({ value: draft, onChange }) => (
        <Field>
          <Input
            value={draft ?? ''}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
          />
        </Field>
      )}
    />
  );
}
