import { sendClientEmail } from '@/lib/resend/send-client-email';

type SendBookingConfirmationEmailParams = {
  to: string;
  name: string;
  bookedTimeString: string;
  addToGoogleCalendarLink: string;
  shootingId: string;
  clientId: string;
};

export function sendBookingConfirmationEmail({
  to,
  name,
  bookedTimeString,
  addToGoogleCalendarLink,
  shootingId,
  clientId,
}: SendBookingConfirmationEmailParams) {
  return sendClientEmail({
    to,
    clientId,
    photoShootingId: shootingId,
    template: 'CLIENT_BOOKING_CONFIRMATION',
    variables: {
      NAME: name,
      BOOKED_TIME: bookedTimeString,
      ADD_TO_GOOGLE_CALENDAR_LINK: addToGoogleCalendarLink,
    },
    tags: [{ name: 'shootingId', value: shootingId }],
  });
}
