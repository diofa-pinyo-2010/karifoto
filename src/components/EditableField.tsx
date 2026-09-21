'use client';

import { useState, useTransition } from 'react';

import { Edit2Icon, SaveIcon, XIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type EditableFieldProps<T> = {
  value: T | null;
  displayValue: React.ReactNode;
  onSave: (value: T | null) => Promise<{ error: string } | void>;
  renderInput: (props: {
    value: T | null;
    onChange: (value: T | null) => void;
  }) => React.ReactNode;
};

export function EditableField<T>({
  value,
  displayValue,
  onSave,
  renderInput,
}: EditableFieldProps<T>) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState<T | null>(value);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleEdit() {
    setDraftValue(value);
    setError(null);
    setIsEditing(true);
  }

  function handleCancel() {
    setError(null);
    setIsEditing(false);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await onSave(draftValue);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setIsEditing(false);
    });
  }

  if (!isEditing) {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="min-w-0">{displayValue}</span>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button size="icon-sm" variant="outline" onClick={handleEdit}>
                <Edit2Icon />
              </Button>
            }
          />
          <TooltipContent>
            <p>Szerkesztés</p>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-end gap-1">
      <div className="flex w-full items-center gap-2">
        <div className="min-w-0 flex-1">
          {renderInput({ value: draftValue, onChange: setDraftValue })}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="icon-sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={handleSave}
                >
                  <SaveIcon />
                </Button>
              }
            />
            <TooltipContent>
              <p>Mentés</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="icon-sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={handleCancel}
                >
                  <XIcon />
                </Button>
              }
            />
            <TooltipContent>
              <p>Mégse</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
