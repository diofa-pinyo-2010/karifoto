import { CommentBody } from '@/components/CommentBody';
import CommentMentionEmail, {
  COMMENT_MENTION_SUBJECT,
} from '@/emails/CommentMention';
import { BASE_URL_PROD } from '@/lib/constants';
import { commentMentionEmailKey } from '@/lib/idempotency';
import { sendReactEmail } from '@/lib/resend/send-react-email';

import type { MentionCandidate } from '@/lib/mentions';

type SendCommentMentionEmailParams = {
  commentMentionId: string;
  to: string;
  name: string;
  authorName: string;
  shootingLabel: string;
  commentBody: string;
  /** Staff mentioned in the comment, so each shows as `@nickname`. */
  staffById: Map<string, MentionCandidate>;
  commentUrl: string;
};

export function sendCommentMentionEmail({
  commentMentionId,
  to,
  commentBody,
  staffById,
  ...props
}: SendCommentMentionEmailParams) {
  return sendReactEmail({
    type: 'COMMENT_MENTION',
    to,
    subject: COMMENT_MENTION_SUBJECT,
    react: CommentMentionEmail({
      ...props,
      // Rendered here, not in the template, which stays free of `@/` imports
      comment: CommentBody({ body: commentBody, staffById }),
      baseUrl: BASE_URL_PROD,
    }),
    idempotencyKey: commentMentionEmailKey(commentMentionId),
  });
}
