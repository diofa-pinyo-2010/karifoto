import { DEPOSIT_REQUEST } from '@/lib/resend/email-templates';
import { sendTemplatedEmail } from '@/lib/resend/send-templated-email';

type DepositRequestEmailParams = {
  to: string;
  name: string;
  bookedTimeString: string;
  summaryUrl: string;
  depositAmount: string;
};

export function sendDepositRequestEmail({
  to,
  name,
  bookedTimeString,
  depositAmount,
  summaryUrl,
}: DepositRequestEmailParams) {
  return sendTemplatedEmail({
    to,
    templateId: DEPOSIT_REQUEST,
    variables: {
      NAME: name,
      BOOKED_TIME: bookedTimeString,
      DEPOSIT_AMOUNT: depositAmount,
      SUMMARY_URL: summaryUrl,
    },
  });
}
