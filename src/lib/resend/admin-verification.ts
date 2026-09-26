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
    template: 'ADMIN_LOGIN',
    variables: { NAME: name, VERIFY_URL: verifyUrl },
  });
}
