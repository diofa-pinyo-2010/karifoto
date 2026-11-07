import EditorSelectionCompletedEmail, {
  EDITOR_SELECTION_COMPLETED_SUBJECT,
} from '@/emails/EditorSelectionCompleted';
import { BASE_URL_PROD } from '@/lib/constants';
import { editorSelectionCompletedEmailKey } from '@/lib/idempotency';
import { sendReactEmail } from '@/lib/resend/send-react-email';

type SendEditorSelectionCompletedEmailParams = {
  shootingId: string;
  to: string;
  name: string;
  shootingLabel: string;
  editedImages: number;
  retouchedImages: number;
  isExpressPostProduction: boolean;
  deadline: string;
  shootingUrl: string;
};

export function sendEditorSelectionCompletedEmail({
  shootingId,
  to,
  ...props
}: SendEditorSelectionCompletedEmailParams) {
  return sendReactEmail({
    type: 'EDITOR_SELECTION_COMPLETED',
    to,
    subject: EDITOR_SELECTION_COMPLETED_SUBJECT,
    react: EditorSelectionCompletedEmail({ ...props, baseUrl: BASE_URL_PROD }),
    tags: [{ name: 'shootingId', value: shootingId }],
    idempotencyKey: editorSelectionCompletedEmailKey(shootingId),
  });
}
