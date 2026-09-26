import { sendClientEmail } from '@/lib/resend/send-client-email';

type ReminderOnTheDayEmailParams = {
  to: string;
  name: string;
  bookedTimeString: string;
  shootingId: string;
  clientId: string;
};

export function sendReminderOnTheDayEmail({
  to,
  name,
  bookedTimeString,
  shootingId,
  clientId,
}: ReminderOnTheDayEmailParams) {
  return sendClientEmail({
    to,
    clientId,
    photoShootingId: shootingId,
    template: 'REMINDER_ON_THE_DAY',
    variables: {
      NAME: name,
      BOOKED_TIME: bookedTimeString,
    },
    tags: [{ name: 'shootingId', value: shootingId }],
  });
}
