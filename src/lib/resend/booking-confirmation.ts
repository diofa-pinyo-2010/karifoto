import { sendClientEmail } from '@/lib/resend/send-client-email';

// TODO: replace once the client portal exists.
const CLIENT_PORTAL_LOGIN_LINK_PLACEHOLDER = 'https://karifoto.hu';

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
    type: 'CLIENT_BOOKING_CONFIRMATION',
    to,
    clientId,
    photoShootingId: shootingId,
    props: {
      name,
      bookedTime: bookedTimeString,
      addToGoogleCalendarLink,
      clientPortalLoginLink: CLIENT_PORTAL_LOGIN_LINK_PLACEHOLDER,
    },
    tags: [{ name: 'shootingId', value: shootingId }],
  });
}
