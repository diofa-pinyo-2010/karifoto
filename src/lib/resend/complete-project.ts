import { EmailType } from '@/generated/prisma/enums';
import { sendClientEmail } from '@/lib/resend/send-client-email';

type CompleteProjectEmailParams = {
  to: string;
  name: string;
  clientPortalLoginLink: string;
  shootingId: string;
};

export function sendCompleteProjectEmail({
  to,
  name,
  clientPortalLoginLink,
  shootingId,
}: CompleteProjectEmailParams) {
  return sendClientEmail({
    type: EmailType.COMPLETED_PROJECT,
    to,
    props: {
      name,
      clientPortalLoginLink,
    },
    tags: [{ name: 'shootingId', value: shootingId }],
  });
}
