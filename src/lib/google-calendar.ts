import { JWT } from 'google-auth-library';
import { google } from 'googleapis';

import { env } from '@/env';
import { STUDIO_ADDRESS } from '@/lib/constants';

const auth = new JWT({
  email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

export const calendar = google.calendar({ version: 'v3', auth });

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
