import { sendClientEmail } from '@/lib/resend/send-client-email';

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
  return sendClientEmail({
    to,
    template: 'DEPOSIT_REQUEST',
    variables: {
      NAME: name,
      BOOKED_TIME: bookedTimeString,
      DEPOSIT_AMOUNT: depositAmount,
      SUMMARY_URL: summaryUrl,
    },
    tags: [{ name: 'bookingIntentId', value: bookingIntentId }],
  });
}
