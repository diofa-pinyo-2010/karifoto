import type { EmailType } from '@/generated/prisma/client';

export const RESEND_EMAIL_TEMPLATES = {
  ADMIN_LOGIN: '3ae95ee3-b1e0-4fd9-a90c-c3b2c7777b4d',
  CLIENT_BOOKING_CONFIRMATION: '148937ac-7724-4722-961c-ade112c94217',
  DEPOSIT_REQUEST: 'e60cdfa1-af80-4b3d-8335-4a13fed05b7b',
  REMINDER_ON_THE_DAY: 'd58a824b-3f75-44e7-87b2-4d5947c1ac34',
  RESCHEDULE_NOTIFICATION: 'e4a1216e-7f26-4c99-9214-1dabe746ea20',
} satisfies Record<EmailType, string>;
