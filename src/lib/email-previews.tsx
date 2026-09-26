import type { ReactElement } from 'react';

import AdminLoginEmail, { ADMIN_LOGIN_SUBJECT } from '@/emails/AdminLogin';
import { BASE_URL_PROD } from '@/lib/constants';

// Templates shown on /admin/email-previews, rendered with their PreviewProps.
// Lives outside src/emails so the React Email preview server doesn't pick it
// up as a template. `baseUrl` points to production — email images must be
// reachable from the public internet.
export type EmailPreview = {
  slug: string;
  label: string;
  subject: string;
  element: () => ReactElement;
};

export const EMAIL_PREVIEWS: readonly EmailPreview[] = [
  {
    slug: 'admin-login',
    label: 'Admin bejelentkezés',
    subject: ADMIN_LOGIN_SUBJECT,
    element: () => (
      <AdminLoginEmail
        {...AdminLoginEmail.PreviewProps}
        baseUrl={BASE_URL_PROD}
      />
    ),
  },
];
