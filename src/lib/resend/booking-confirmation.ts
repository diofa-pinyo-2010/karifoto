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
    template: 'CLIENT_BOOKING_CONFIRMATION',
    variables: {
      NAME: name,
      BOOKED_TIME: bookedTimeString,
      ADD_TO_GOOGLE_CALENDAR_LINK: addToGoogleCalendarLink,
    },
    tags: [{ name: 'shootingId', value: shootingId }],
  });
}
