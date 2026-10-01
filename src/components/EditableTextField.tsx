'use client';

import { EditableField } from '@/components/EditableField';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

type EditableTextFieldProps = {
  value: string | null;
  placeholder?: string;
  emptyLabel?: string;
  type?: 'text' | 'email' | 'number' | 'tel';
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  displayValue?: React.ReactNode;
  onSave: (value: string | null) => Promise<{ error: string } | void>;
  disabled?: boolean;
};

export function EditableTextField({
  value,
  placeholder,
  emptyLabel = '–',
  type = 'text',
  inputMode,
  displayValue,
  onSave,
  disabled = false,
}: EditableTextFieldProps) {
  return (
    <EditableField<string>
      value={value}
      displayValue={displayValue ?? value ?? emptyLabel}
      onSave={(text) => onSave(text?.trim() || null)}
      disabled={disabled}
      renderInput={({ value: draft, onChange }) => (
        <Field>
          <Input
            type={type}
            inputMode={inputMode}
            value={draft ?? ''}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            // oxlint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
        </Field>
      )}
    />
  );
}
