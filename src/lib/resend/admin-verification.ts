import { ADMIN_LOGIN } from '@/lib/resend/email-templates';
import { sendTemplatedEmail } from '@/lib/resend/send-templated-email';

type SendAdminVerificationEmailParams = {
  to: string;
  name: string;
  verifyUrl: string;
};

export function sendAdminVerificationEmail({
  to,
  name,
  verifyUrl,
}: SendAdminVerificationEmailParams) {
  return sendTemplatedEmail({
    to,
    templateId: ADMIN_LOGIN,
    variables: { NAME: name, VERIFY_URL: verifyUrl },
  });
}
