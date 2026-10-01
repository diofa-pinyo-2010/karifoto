import type { ReactElement } from 'react';

import AdminLoginEmail, { ADMIN_LOGIN_SUBJECT } from '@/emails/AdminLogin';
import BookingConfirmationEmail, {
  CLIENT_BOOKING_CONFIRMATION_SUBJECT,
} from '@/emails/BookingConfirmation';
import DepositRequestEmail, {
  CLIENT_DEPOSIT_REQUEST_SUBJECT,
} from '@/emails/DepositRequest';
import ImageSelectionEmail, {
  CLIENT_IMAGE_SELECTION_SUBJECT,
} from '@/emails/ImageSelection';
import ReminderOnTheDayEmail, {
  CLIENT_REMINDER_ON_THE_DAY_SUBJECT,
} from '@/emails/ReminderOnTheDay';
import RescheduleNotificationEmail, {
  CLIENT_RESCHEDULE_NOTIFICATION_SUBJECT,
} from '@/emails/RescheduleNotification';
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
  {
    slug: 'client-booking-confirmation',
    label: 'Foglalás megerősítése',
    subject: CLIENT_BOOKING_CONFIRMATION_SUBJECT,
    element: () => (
      <BookingConfirmationEmail
        {...BookingConfirmationEmail.PreviewProps}
        baseUrl={BASE_URL_PROD}
      />
    ),
  },
  {
    slug: 'client-deposit-request',
    label: 'Előleg bekérő',
    subject: CLIENT_DEPOSIT_REQUEST_SUBJECT,
    element: () => (
      <DepositRequestEmail
        {...DepositRequestEmail.PreviewProps}
        baseUrl={BASE_URL_PROD}
      />
    ),
  },
  {
    slug: 'client-reminder-on-the-day',
    label: 'Aznapi emlékezető',
    subject: CLIENT_REMINDER_ON_THE_DAY_SUBJECT,
    element: () => (
      <ReminderOnTheDayEmail
        {...ReminderOnTheDayEmail.PreviewProps}
        baseUrl={BASE_URL_PROD}
      />
    ),
  },
  {
    slug: 'client-reschedule-notification',
    label: 'Időpont változás értesítő',
    subject: CLIENT_RESCHEDULE_NOTIFICATION_SUBJECT,
    element: () => (
      <RescheduleNotificationEmail
        {...RescheduleNotificationEmail.PreviewProps}
        baseUrl={BASE_URL_PROD}
      />
    ),
  },
  {
    slug: 'client-image-selection',
    label: 'Kép válogatás kérése',
    subject: CLIENT_IMAGE_SELECTION_SUBJECT,
    element: () => (
      <ImageSelectionEmail
        {...ImageSelectionEmail.PreviewProps}
        baseUrl={BASE_URL_PROD}
      />
    ),
  },
];
