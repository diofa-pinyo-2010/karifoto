import { RESEND_EMAIL_TEMPLATES } from '@/lib/resend/email-templates';
import { resend } from '@/lib/resend/index';

import type { EmailType } from '@/generated/prisma/client';
import type { EmailTemplateVariables } from '@/lib/resend/email-template-variables.generated';

type SendTemplatedEmailParams<T extends EmailType> = {
  to: string | string[];
  template: T;
  variables: EmailTemplateVariables[T];
  from?: string;
  subject?: string;
  tags?: { name: string; value: string }[];
};

export async function sendTemplatedEmail<T extends EmailType>({
  to,
  template,
  variables,
  from,
  subject,
  tags,
}: SendTemplatedEmailParams<T>) {
  return resend.emails.send({
    to,
    from,
    subject,
    template: { id: RESEND_EMAIL_TEMPLATES[template], variables },
    tags: [{ name: 'type', value: template }, ...(tags ?? [])],
  });
}
