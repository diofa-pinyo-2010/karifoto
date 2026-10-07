import { SumUp } from '@sumup/sdk';

import { env } from '@/env';
import { toSumUpMoney } from '@/lib/sumup/money';

const sumup = new SumUp({ apiKey: env.SUMUP_API_KEY });

export async function createSumUpCheckout({
  paymentAttemptId,
  amountInCents,
  clientName,
}: {
  paymentAttemptId: string;
  amountInCents: number;
  clientName: string;
}) {
  return sumup.readers.createCheckout(
    env.SUMUP_MERCHANT_CODE,
    env.SUMUP_READER_ID,
    {
      affiliate: {
        app_id: env.SUMUP_AFFILIATE_APP_ID,
        key: env.SUMUP_AFFILIATE_KEY,
        foreign_transaction_id: paymentAttemptId,
      },
      total_amount: toSumUpMoney(amountInCents),
      description: `${clientName} – Karácsonyi fotózás`,
      return_url: `${env.NEXT_PUBLIC_SITE_URL}/api/webhooks/sumup`,
    },
  );
}

export async function getTransaction(clientTransactionId: string) {
  return sumup.transactions.get(env.SUMUP_MERCHANT_CODE, {
    client_transaction_id: clientTransactionId,
  });
}

export async function terminateSumUpCheckout() {
  return sumup.readers.terminateCheckout(
    env.SUMUP_MERCHANT_CODE,
    env.SUMUP_READER_ID,
  );
}
