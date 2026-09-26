import {
  RESEND_EMAIL_TEMPLATES,
  type EmailTemplate,
} from '@/lib/resend/email-templates';
import { resend } from '@/lib/resend/index';

import type { EmailTemplateVariables } from '@/lib/resend/email-template-variables.generated';

export type SendTemplatedEmailParams<T extends EmailTemplate> = {
  to: string | string[];
  template: T;
  variables: EmailTemplateVariables[T];
  from?: string;
  subject?: string;
  tags?: { name: string; value: string }[];
};

// Low-level send, records nothing. Client emails go through `sendClientEmail`.
export async function sendTemplatedEmail<T extends EmailTemplate>({
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
