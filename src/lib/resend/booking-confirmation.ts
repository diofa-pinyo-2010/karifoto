import { CLIENT_BOOKING_CONFIRMATION } from '@/lib/resend/email-templates';
import { sendTemplatedEmail } from '@/lib/resend/send-templated-email';

type SendBookingConfirmationEmailParams = {
  to: string;
  name: string;
  bookedTimeString: string;
};

export function sendBookingConfirmationEmail({
  to,
  name,
  bookedTimeString,
}: SendBookingConfirmationEmailParams) {
  return sendTemplatedEmail({
    to,
    templateId: CLIENT_BOOKING_CONFIRMATION,
    variables: { NAME: name, BOOKED_TIME: bookedTimeString },
  });
}
