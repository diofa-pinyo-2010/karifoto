import { RESCHEDULE_NOTIFICATION } from '@/lib/resend/email-templates';
import { sendTemplatedEmail } from '@/lib/resend/send-templated-email';

type RescheduleNotificationEmailParams = {
  to: string;
  name: string;
  bookedTimeString: string;
  oldTimeString: string;
  addToGoogleCalendarLink: string;
};

export function sendRescheduleNotificationEmail({
  to,
  name,
  bookedTimeString,
  oldTimeString,
  addToGoogleCalendarLink,
}: RescheduleNotificationEmailParams) {
  return sendTemplatedEmail({
    to,
    templateId: RESCHEDULE_NOTIFICATION,
    variables: {
      NAME: name,
      BOOKED_TIME: bookedTimeString,
      OLD_TIME: oldTimeString,
      ADD_TO_GOOGLE_CALENDAR_LINK: addToGoogleCalendarLink,
    },
  });
}
