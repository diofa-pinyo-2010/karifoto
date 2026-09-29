import { sendClientEmail } from '@/lib/resend/send-client-email';

type SendBookingConfirmationEmailParams = {
  to: string;
  name: string;
  bookedTimeString: string;
  addToGoogleCalendarLink: string;
  clientPortalLoginLink: string;
  shootingId: string;
  clientId: string;
};

export function sendBookingConfirmationEmail({
  to,
  name,
  bookedTimeString,
  addToGoogleCalendarLink,
  clientPortalLoginLink,
  shootingId,
  clientId,
}: SendBookingConfirmationEmailParams) {
  return sendClientEmail({
    type: 'CLIENT_BOOKING_CONFIRMATION',
    to,
    clientId,
    photoShootingId: shootingId,
    props: {
      name,
      bookedTime: bookedTimeString,
      addToGoogleCalendarLink,
      clientPortalLoginLink,
    },
    tags: [{ name: 'shootingId', value: shootingId }],
  });
}
