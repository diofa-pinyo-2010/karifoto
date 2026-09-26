import { sendTemplatedEmail } from '@/lib/resend/send-templated-email';

type ReminderOnTheDayEmailParams = {
  to: string;
  name: string;
  bookedTimeString: string;
  shootingId: string;
};

export function sendReminderOnTheDayEmail({
  to,
  name,
  bookedTimeString,
  shootingId,
}: ReminderOnTheDayEmailParams) {
  return sendTemplatedEmail({
    to,
    template: 'REMINDER_ON_THE_DAY',
    variables: {
      NAME: name,
      BOOKED_TIME: bookedTimeString,
    },
    tags: [{ name: 'shootingId', value: shootingId }],
  });
}
