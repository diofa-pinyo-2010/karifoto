import { JWT } from 'google-auth-library';
import { google } from 'googleapis';

import { env } from '@/env';
import {
  APP_URLS,
  isLightPlayChargeable,
  STUDIO_ADDRESS,
} from '@/lib/constants';
import { getShootingEndTime } from '@/lib/utils';

import type { Package } from '@/generated/prisma/enums';

const auth = new JWT({
  email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: env.GOOGLE_PRIVATE_KEY,
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

export const calendar = google.calendar({ version: 'v3', auth });

// The staff calendar event is a pure function of the shooting in the DB, so
// the create and sync jobs build it the same way.
export function buildShootingCalendarEvent(shooting: {
  id: string;
  package: Package;
  isLightPlaySelected: boolean;
  clientNote: string | null;
  startTime: Date;
  clientName: string;
  clientPhoneNumber: string;
}) {
  const isLightPlayExtra =
    isLightPlayChargeable(shooting.package) && shooting.isLightPlaySelected;

  return {
    title: `📸 ${shooting.package}${isLightPlayExtra ? ' (+F)' : ''} | ${shooting.clientName}`,
    description: `
        Fotózás oldala az adminon:
        ${env.NEXT_PUBLIC_SITE_URL}${APP_URLS.photoShootingAdminPage(shooting.id)}

        Kért külön fényjátékot? (Csak MINI és CLASSIC esetén számít)
        ${isLightPlayExtra ? 'IGEN' : 'NEM'}

        Ügyfél:
        ${shooting.clientName}
        ${shooting.clientPhoneNumber}

        Megjegyzés:
        ${shooting.clientNote ? shooting.clientNote : '–'}
      `,
    startTime: shooting.startTime,
    endTime: getShootingEndTime(
      shooting.startTime,
      shooting.package,
      shooting.isLightPlaySelected,
    ),
  };
}

export async function createCalendarEvent({
  title,
  description,
  startTime,
  endTime,
}: {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
}) {
  const response = await calendar.events.insert({
    calendarId: env.GOOGLE_CALENDAR_ID,
    requestBody: {
      summary: title,
      description,
      location: STUDIO_ADDRESS,
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
    },
  });

  return response.data;
}

export async function updateCalendarEvent({
  eventId,
  title,
  description,
  startTime,
  endTime,
}: {
  eventId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
}) {
  const response = await calendar.events.update({
    calendarId: env.GOOGLE_CALENDAR_ID,
    eventId,
    requestBody: {
      summary: title,
      description,
      location: STUDIO_ADDRESS,
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
    },
  });

  return response.data;
}

export async function deleteCalendarEvent(eventId: string) {
  await calendar.events.delete({
    calendarId: env.GOOGLE_CALENDAR_ID,
    eventId,
  });
}
