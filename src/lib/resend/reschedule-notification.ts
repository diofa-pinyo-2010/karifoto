import { RESEND_EMAIL_TEMPLATES } from '@/lib/resend/email-templates';
import { sendTemplatedEmail } from '@/lib/resend/send-templated-email';

type RescheduleNotificationEmailParams = {
  to: string;
  name: string;
  bookedTimeString: string;
  oldTimeString: string;
  addToGoogleCalendarLink: string;
  shootingId: string;
};

export function sendRescheduleNotificationEmail({
  to,
  name,
  bookedTimeString,
  oldTimeString,
  addToGoogleCalendarLink,
  shootingId,
}: RescheduleNotificationEmailParams) {
  return sendTemplatedEmail({
    to,
    templateId: RESEND_EMAIL_TEMPLATES.RESCHEDULE_NOTIFICATION,
    variables: {
      NAME: name,
      BOOKED_TIME: bookedTimeString,
      OLD_TIME: oldTimeString,
      ADD_TO_GOOGLE_CALENDAR_LINK: addToGoogleCalendarLink,
    },
    tags: [
      { name: 'type', value: 'RESCHEDULE_NOTIFICATION' },
      { name: 'shootingId', value: shootingId },
    ],
  });
}
