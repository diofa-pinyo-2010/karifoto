// src/lib/resend/send-react-email.ts
import type { ReactElement } from 'react';

import { resend } from '@/lib/resend/index';

export const EMAIL_FROM =
  process.env.NODE_ENV === 'development'
    ? 'Karifoto DEV <dev@dev.karifoto.hu>'
    : 'Karifoto <nevalaszolj@ertesitesek.karifoto.hu>';

type SendReactEmailParams = {
  type: string; // → 'type' tag, same as sendTemplatedEmail
  to: string | string[];
  subject: string;
  react: ReactElement;
  from?: string;
  tags?: { name: string; value: string }[];
};

export function sendReactEmail({
  type,
  to,
  subject,
  react,
  from = EMAIL_FROM,
  tags,
}: SendReactEmailParams) {
  return resend.emails.send({
    to,
    from,
    subject,
    react,
    tags: [{ name: 'type', value: type }, ...(tags ?? [])],
  });
}
