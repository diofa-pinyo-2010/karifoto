import { sendClientEmail } from '@/lib/resend/send-client-email';

type RescheduleNotificationEmailParams = {
  to: string;
  name: string;
  bookedTimeString: string;
  oldTimeString: string;
  addToGoogleCalendarLink: string;
  shootingId: string;
  clientId: string;
};

export function sendRescheduleNotificationEmail({
  to,
  name,
  bookedTimeString,
  oldTimeString,
  addToGoogleCalendarLink,
  shootingId,
  clientId,
}: RescheduleNotificationEmailParams) {
  return sendClientEmail({
    type: 'RESCHEDULE_NOTIFICATION',
    to,
    clientId,
    photoShootingId: shootingId,
    props: {
      name,
      bookedTime: bookedTimeString,
      oldTime: oldTimeString,
      addToGoogleCalendarLink,
    },
    tags: [{ name: 'shootingId', value: shootingId }],
  });
}
