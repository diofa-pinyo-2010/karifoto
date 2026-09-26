import { RESEND_EMAIL_TEMPLATES } from '@/lib/resend/email-templates';
import { sendTemplatedEmail } from '@/lib/resend/send-templated-email';

type SendBookingConfirmationEmailParams = {
  to: string;
  name: string;
  bookedTimeString: string;
  addToGoogleCalendarLink: string;
  shootingId: string;
};

export function sendBookingConfirmationEmail({
  to,
  name,
  bookedTimeString,
  addToGoogleCalendarLink,
  shootingId,
}: SendBookingConfirmationEmailParams) {
  return sendTemplatedEmail({
    to,
    templateId: RESEND_EMAIL_TEMPLATES.CLIENT_BOOKING_CONFIRMATION,
    variables: {
      NAME: name,
      BOOKED_TIME: bookedTimeString,
      ADD_TO_GOOGLE_CALENDAR_LINK: addToGoogleCalendarLink,
    },
    tags: [
      { name: 'type', value: 'CLIENT_BOOKING_CONFIRMATION' },
      { name: 'shootingId', value: shootingId },
    ],
  });
}
