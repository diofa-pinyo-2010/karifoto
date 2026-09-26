import { RESEND_EMAIL_TEMPLATES } from '@/lib/resend/email-templates';
import { sendTemplatedEmail } from '@/lib/resend/send-templated-email';

type DepositRequestEmailParams = {
  to: string;
  name: string;
  bookedTimeString: string;
  summaryUrl: string;
  depositAmount: string;
  bookingIntentId: string;
};

export function sendDepositRequestEmail({
  to,
  name,
  bookedTimeString,
  depositAmount,
  summaryUrl,
  bookingIntentId,
}: DepositRequestEmailParams) {
  return sendTemplatedEmail({
    to,
    templateId: RESEND_EMAIL_TEMPLATES.DEPOSIT_REQUEST,
    variables: {
      NAME: name,
      BOOKED_TIME: bookedTimeString,
      DEPOSIT_AMOUNT: depositAmount,
      SUMMARY_URL: summaryUrl,
    },
    tags: [
      { name: 'type', value: 'DEPOSIT_REQUEST' },
      { name: 'bookingIntentId', value: bookingIntentId },
    ],
  });
}
