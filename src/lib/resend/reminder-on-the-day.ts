import { RESEND_EMAIL_TEMPLATES } from '@/lib/resend/email-templates';
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
    templateId: RESEND_EMAIL_TEMPLATES.REMINDER_ON_THE_DAY,
    variables: {
      NAME: name,
      BOOKED_TIME: bookedTimeString,
    },
    tags: [
      { name: 'type', value: 'REMINDER_ON_THE_DAY' },
      { name: 'shootingId', value: shootingId },
    ],
  });
}
