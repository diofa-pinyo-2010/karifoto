import { CommentBody } from '@/components/CommentBody';
import { CommentForm } from '@/components/CommentForm';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { shortFullDateFormatter } from '@/lib/formatters';
import { cn, getInitials } from '@/lib/utils';

import type { CommentFormState } from '@/server/comments';

export interface CommentItem {
  id: string;
  body: string;
  createdAt: Date;
  author: { nickname: string } | null;
}

/**
 * Owner-agnostic: the page passes the comments and an action already bound to
 * its owner, so the same card works for any future `Comment` owner.
 * Rendered on the server so timestamps are formatted once, in Budapest time.
 */
export function CommentsCard({
  comments,
  action,
  className,
}: {
  comments: CommentItem[];
  action: (
    state: CommentFormState,
    formData: FormData,
  ) => Promise<CommentFormState>;
  className?: string;
}) {
  return (
    <section
      aria-labelledby="comments-title"
      className={cn('flex flex-col rounded-lg border bg-card', className)}
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h3 id="comments-title" className="text-lg font-medium">
          Megjegyzések
        </h3>
        <Badge variant="secondary" className="rounded-full">
          {comments.length}
        </Badge>
      </div>

      <CommentForm action={action} />

      {comments.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          Még nincs megjegyzés.
        </p>
      ) : (
        <ol className="lg:max-h-160 lg:overflow-y-auto">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className="flex gap-3 border-b px-4 py-3.5 last:border-b-0"
            >
              <Avatar aria-hidden>
                <AvatarFallback className="bg-violet-100 text-xs font-semibold text-violet-800 dark:bg-violet-950 dark:text-violet-200">
                  {comment.author ? getInitials(comment.author.nickname) : '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      comment.author == null && 'text-muted-foreground',
                    )}
                  >
                    {comment.author?.nickname ?? 'Törölt munkatárs'}
                  </span>
                  <time
                    dateTime={comment.createdAt.toISOString()}
                    className="text-xs text-muted-foreground"
                  >
                    {shortFullDateFormatter.format(comment.createdAt)}
                  </time>
                </div>
                <CommentBody body={comment.body} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
