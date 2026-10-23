'use client';

import { useActionState, useId } from 'react';

import { SendIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { COMMENT_MAX_LENGTH } from '@/lib/constants';

import type { CommentFormState } from '@/server/comments';

export function CommentForm({
  action,
}: {
  action: (
    state: CommentFormState,
    formData: FormData,
  ) => Promise<CommentFormState>;
}) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const id = useId();
  const errorId = `${id}-error`;
  const failed = state != null && 'error' in state ? state : undefined;

  return (
    <form
      action={formAction}
      className="flex flex-col gap-2 border-b px-4 pb-4"
    >
      <Label htmlFor={id} className="font-normal text-muted-foreground">
        Új megjegyzés a csapatnak
      </Label>
      <Textarea
        id={id}
        name="body"
        rows={4}
        required
        maxLength={COMMENT_MAX_LENGTH}
        // React resets the form after the action; on error this brings the text back
        defaultValue={failed?.body}
        placeholder="Pl. a kisállat érkezése, különleges kérés, átadás…"
        aria-invalid={failed ? true : undefined}
        aria-describedby={failed ? errorId : undefined}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        className="min-h-24 resize-y lg:text-sm"
      />
      {failed && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {failed.error}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="hidden text-xs text-muted-foreground sm:inline">
          Ctrl/⌘ + Enter a küldéshez
        </span>
        <Button
          type="submit"
          size="lg"
          disabled={isPending}
          className="h-11 w-full sm:h-9 sm:w-auto"
        >
          {isPending ? <Spinner /> : <SendIcon />}
          Hozzászólás
        </Button>
      </div>
    </form>
  );
}
