import { CLIENT_BOOKING_CONFIRMATION } from '@/lib/resend/email-templates';
import { sendTemplatedEmail } from '@/lib/resend/send-templated-email';

type SendBookingConfirmationEmailParams = {
  to: string;
  name: string;
  bookedTimeString: string;
  addToGoogleCalendarLink: string;
};

export function sendBookingConfirmationEmail({
  to,
  name,
  bookedTimeString,
  addToGoogleCalendarLink,
}: SendBookingConfirmationEmailParams) {
  return sendTemplatedEmail({
    to,
    templateId: CLIENT_BOOKING_CONFIRMATION,
    variables: {
      NAME: name,
      BOOKED_TIME: bookedTimeString,
      ADD_TO_GOOGLE_CALENDAR_LINK: addToGoogleCalendarLink,
    },
  });
}
