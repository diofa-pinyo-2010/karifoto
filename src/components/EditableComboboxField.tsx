'use client';

import { EditableField } from '@/components/EditableField';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import { Field } from '@/components/ui/field';

export type ComboboxFieldItem = {
  value: string;
  label: string;
};

type EditableComboboxFieldProps = {
  value: ComboboxFieldItem | null;
  items: ComboboxFieldItem[];
  placeholder?: string;
  emptyLabel?: string;
  /** Custom content for the current selection in the non-edit view. Defaults to `value.label`. */
  displayValue?: React.ReactNode;
  onSave: (value: string | null) => Promise<{ error: string } | void>;
};

export function EditableComboboxField({
  value,
  items,
  placeholder = 'Válassz!',
  emptyLabel = 'Nincs kiválasztva',
  displayValue,
  onSave,
}: EditableComboboxFieldProps) {
  return (
    <EditableField<ComboboxFieldItem>
      value={value}
      displayValue={displayValue ?? value?.label ?? emptyLabel}
      onSave={(item) => onSave(item?.value ?? null)}
      renderInput={({ value: draft, onChange }) => (
        <Field>
          <Combobox
            items={items}
            value={draft}
            onValueChange={onChange}
            isItemEqualToValue={(a, b) => a.value === b.value}
          >
            <ComboboxInput placeholder={placeholder} showClear />
            <ComboboxContent>
              <ComboboxEmpty>Nincs találat.</ComboboxEmpty>
              <ComboboxList>
                {(item: ComboboxFieldItem) => (
                  <ComboboxItem key={item.value} value={item}>
                    {item.label}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </Field>
      )}
    />
  );
}
