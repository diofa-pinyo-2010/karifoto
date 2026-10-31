import type { ReactElement } from 'react';

import { env } from '@/env';
import { resend } from '@/lib/resend/index';

// Only production deployments send from the real address — local dev and
// Vercel previews use the DEV sender.
export const EMAIL_FROM =
  env.NEXT_PUBLIC_VERCEL_ENV === 'production'
    ? 'Karifoto <nevalaszolj@ertesitesek.karifoto.hu>'
    : 'Karifoto DEV <dev@dev.karifoto.hu>';

type SendReactEmailParams = {
  type: string; // → 'type' tag
  to: string | string[];
  cc?: string | string[];
  subject: string;
  react: ReactElement;
  from?: string;
  tags?: { name: string; value: string }[];
  /** Resend sends one email per key within 24 hours, so a retried job cannot send twice. */
  idempotencyKey?: string;
};

export function sendReactEmail({
  type,
  to,
  cc,
  subject,
  react,
  from = EMAIL_FROM,
  tags,
  idempotencyKey,
}: SendReactEmailParams) {
  return resend.emails.send(
    {
      to,
      cc,
      from,
      subject,
      react,
      tags: [{ name: 'type', value: type }, ...(tags ?? [])],
    },
    { idempotencyKey },
  );
}
