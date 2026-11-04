import { EmailType } from '@/generated/prisma/enums';
import { sendClientEmail } from '@/lib/resend/send-client-email';

type CompleteProjectEmailParams = {
  to: string;
  name: string;
  clientPortalLoginLink: string;
  shootingId: string;
  clientId: string;
};

export function sendCompleteProjectEmail({
  to,
  name,
  clientPortalLoginLink,
  shootingId,
  clientId,
}: CompleteProjectEmailParams) {
  return sendClientEmail({
    type: EmailType.COMPLETED_PROJECT,
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
