import { prisma } from '@/lib/prisma';
import { resend } from '@/lib/resend/index';
import {
  sendTemplatedEmail,
  type SendTemplatedEmailParams,
} from '@/lib/resend/send-templated-email';

import type { EmailType } from '@/generated/prisma/client';

type SendClientEmailParams<T extends EmailType> =
  SendTemplatedEmailParams<T> & {
    clientId?: string;
    photoShootingId?: string;
  };

// Sends a client email and records it in `SentEmail`. Recording failures are
// logged, not thrown — the email is already out, and throwing would make the
// QStash jobs retry and send it twice.
export async function sendClientEmail<T extends EmailType>({
  clientId,
  photoShootingId,
  ...params
}: SendClientEmailParams<T>) {
  const result = await sendTemplatedEmail(params);

  if (result.data != null) {
    await recordSentEmail({
      resendId: result.data.id,
      type: params.template,
      variables: params.variables,
      clientId,
      photoShootingId,
    });
  }

  return result;
}

async function recordSentEmail({
  resendId,
  type,
  variables,
  clientId,
  photoShootingId,
}: {
  resendId: string;
  type: EmailType;
  variables: Record<string, string | number | undefined>;
  clientId?: string;
  photoShootingId?: string;
}) {
  try {
    // The subject is resolved from the Resend template, so it only exists on
    // Resend's side. Drop this lookup once templates live in code.
    const { data: email, error } = await resend.emails.get(resendId);
    if (error != null || email == null) {
      throw new Error(`Resend email lookup failed: ${error?.message}`, {
        cause: error,
      });
    }

    await prisma.sentEmail.create({
      data: {
        resendId,
        type,
        to: email.to.join(', '),
        subject: email.subject,
        variables,
        sentAt: new Date(email.created_at),
        clientId,
        photoShootingId,
      },
    });
  } catch (error) {
    console.error('[sendClientEmail] failed to record sent email', {
      resendId,
      type,
      error,
    });
  }
}
