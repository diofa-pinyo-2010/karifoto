import AdminLoginEmail, { ADMIN_LOGIN_SUBJECT } from '@/emails/AdminLogin';
import { BASE_URL_PROD } from '@/lib/constants';
import { sendReactEmail } from '@/lib/resend/send-react-email';

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
  return sendReactEmail({
    type: 'ADMIN_LOGIN',
    to,
    subject: ADMIN_LOGIN_SUBJECT,
    react: AdminLoginEmail({
      name,
      verifyUrl,
      baseUrl: BASE_URL_PROD,
    }),
  });
}
