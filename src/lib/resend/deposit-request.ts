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
    type: 'DEPOSIT_REQUEST',
    to,
    props: {
      name,
      bookedTime: bookedTimeString,
      depositAmount,
      summaryUrl,
    },
    tags: [{ name: 'bookingIntentId', value: bookingIntentId }],
  });
}
