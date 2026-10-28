'use server';

import { revalidatePath } from 'next/cache';

import * as z from 'zod';

import { APP_URLS } from '@/lib/constants';
import { verifySession } from '@/lib/dal';
import { listReaders } from '@/lib/sumup/client';
import { saveSelectedPaymentReaderId } from '@/server/payment-reader';

export async function setPaymentReader(
  readerId: string,
): Promise<{ success: true } | { error: string }> {
  await verifySession();

  const parsed = z.string().min(1).safeParse(readerId);
  if (!parsed.success) {
    return { error: 'Érvénytelen reader ID.' };
  }

  try {
    const readers = await listReaders();
    const reader = readers.find(({ id }) => id === parsed.data);
    if (!reader) {
      return { error: 'Ez a terminál nem tartozik a SumUp fiókhoz.' };
    }
    if (reader.status !== 'paired') {
      return { error: 'Csak párosított terminál választható.' };
    }

    await saveSelectedPaymentReaderId(reader.id);
  } catch (error) {
    console.error('[sumup-readers] failed to set payment reader', error);
    return { error: 'Nem sikerült menteni a fizetési terminált.' };
  }

  revalidatePath(APP_URLS.terminals);
  return { success: true };
}
