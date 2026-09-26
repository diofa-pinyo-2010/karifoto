import { Resend } from 'resend';

import { env } from '@/env';

export const resend = new Resend(env.RESEND_API_KEY);

export function resendEmailUrl(resendEmailId: string): string {
  return `https://resend.com/emails/${resendEmailId}`;
}
