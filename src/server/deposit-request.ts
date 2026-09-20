'use server';

import { env } from '@/env';
import { qStashClient } from '@/lib/upstash';

export async function sendDepositRequest(
  bookingIntentId: string,
): Promise<{ error: string } | { success: true }> {
  try {
    await qStashClient.publishJSON({
      url: `${env.NEXT_PUBLIC_SITE_URL}/api/jobs/deposit-request`,
      body: { bookingIntentId },
      retries: 3,
    });
    return { success: true };
  } catch (error) {
    console.error('[deposit-request] failed to queue job', error);
    return { error: 'Nem sikerült elküldeni az előlegbekérőt. Próbáld újra.' };
  }
}
