import { cancellationEmailKey } from '@/lib/idempotency';
import { sendClientEmail } from '@/lib/resend/send-client-email';

type CancellationNotificationEmailParams = {
  to: string;
  name: string;
  bookedTimeString: string;
  refunded: boolean;
  clientPortalLoginLink: string;
  shootingId: string;
  clientId: string;
};

export function sendCancellationNotificationEmail({
  to,
  name,
  bookedTimeString,
  refunded,
  clientPortalLoginLink,
  shootingId,
  clientId,
}: CancellationNotificationEmailParams) {
  return sendClientEmail({
    type: 'CANCELLATION_NOTIFICATION',
    to,
    clientId,
    photoShootingId: shootingId,
    props: {
      name,
      bookedTime: bookedTimeString,
      refunded,
      clientPortalLoginLink,
    },
    tags: [{ name: 'shootingId', value: shootingId }],
    idempotencyKey: cancellationEmailKey(shootingId),
  });
}
