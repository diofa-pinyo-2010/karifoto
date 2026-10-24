import CommentMentionEmail, {
  COMMENT_MENTION_SUBJECT,
} from '@/emails/CommentMention';
import { BASE_URL_PROD } from '@/lib/constants';
import { commentMentionEmailKey } from '@/lib/idempotency';
import { sendReactEmail } from '@/lib/resend/send-react-email';

type SendCommentMentionEmailParams = {
  commentMentionId: string;
  to: string;
  name: string;
  authorName: string;
  shootingLabel: string;
  commentText: string;
  commentUrl: string;
};

export function sendCommentMentionEmail({
  commentMentionId,
  to,
  ...props
}: SendCommentMentionEmailParams) {
  return sendReactEmail({
    type: 'COMMENT_MENTION',
    to,
    subject: COMMENT_MENTION_SUBJECT,
    react: CommentMentionEmail({ ...props, baseUrl: BASE_URL_PROD }),
    idempotencyKey: commentMentionEmailKey(commentMentionId),
  });
}
