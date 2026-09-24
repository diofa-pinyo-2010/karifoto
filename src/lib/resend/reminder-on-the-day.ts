import { REMINDER_ON_THE_DAY } from '@/lib/resend/email-templates';
import { sendTemplatedEmail } from '@/lib/resend/send-templated-email';

type ReminderOnTheDayEmailParams = {
  to: string;
  name: string;
  bookedTimeString: string;
};

export function sendReminderOnTheDayEmail({
  to,
  name,
  bookedTimeString,
}: ReminderOnTheDayEmailParams) {
  return sendTemplatedEmail({
    to,
    templateId: REMINDER_ON_THE_DAY,
    variables: {
      NAME: name,
      BOOKED_TIME: bookedTimeString,
    },
  });
}
