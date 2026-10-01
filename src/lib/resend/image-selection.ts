import { EmailType } from '@/generated/prisma/enums';
import { sendClientEmail } from '@/lib/resend/send-client-email';

type SendImageSelectionEmailParams = {
  to: string;
  name: string;
  clientPortalLoginLink: string;
  shootingId: string;
  clientId: string;
};

export function sendImageSelectionEmail({
  to,
  name,
  clientPortalLoginLink,
  shootingId,
  clientId,
}: SendImageSelectionEmailParams) {
  return sendClientEmail({
    type: EmailType.IMAGE_SELECTION,
    to,
    clientId,
    photoShootingId: shootingId,
    props: {
      name,
      clientPortalLoginLink,
    },
    tags: [{ name: 'shootingId', value: shootingId }],
  });
}
