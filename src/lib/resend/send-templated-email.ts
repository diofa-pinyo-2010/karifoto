import { resend } from '@/lib/resend/index';

type SendTemplatedEmailParams = {
  to: string | string[];
  templateId: string;
  variables?: Record<string, string | number>;
  from?: string;
  subject?: string;
};

export async function sendTemplatedEmail({
  to,
  templateId,
  variables,
  from,
  subject,
}: SendTemplatedEmailParams) {
  return resend.emails.send({
    to,
    from,
    subject,
    template: { id: templateId, variables },
  });
}
