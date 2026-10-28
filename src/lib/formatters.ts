import { STUDIO_TZ } from '@/lib/constants';

// szerda
export const weekDayFormatter = new Intl.DateTimeFormat('hu-Hu', {
  timeZone: STUDIO_TZ,
  weekday: 'long',
});

// SZE
export const weekDayFormatterShort = new Intl.DateTimeFormat('hu-Hu', {
  timeZone: STUDIO_TZ,
  weekday: 'short',
});

// dec. 1.
export const shortDateFormatter = new Intl.DateTimeFormat('hu-Hu', {
  timeZone: STUDIO_TZ,
  month: 'short',
  day: 'numeric',
});

// szeptember 13.
export const monthDayFormatter = new Intl.DateTimeFormat('hu-Hu', {
  timeZone: STUDIO_TZ,
  month: 'long',
  day: 'numeric',
});

// 12:00
export const timeFormatter = new Intl.DateTimeFormat('hu-Hu', {
  timeZone: STUDIO_TZ,
  hour: 'numeric',
  minute: '2-digit',
});

// 09:00 — zero-padded, for <input type="time"> values
export const timeInputFormatter = new Intl.DateTimeFormat('hu-HU', {
  timeZone: STUDIO_TZ,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

// nov. 1., vasárnap 10:00
export const shortFullDateFormatter = new Intl.DateTimeFormat('hu-Hu', {
  timeZone: STUDIO_TZ,
  month: 'short',
  day: 'numeric',
  weekday: 'long',
  hour: 'numeric',
  minute: 'numeric',
});

// szombat, december 13.
export const dateFormatter = new Intl.DateTimeFormat('hu-HU', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

export const formatLongDate = (date: Date) => {
  return `${dateFormatter.format(date)[0].toUpperCase()}${dateFormatter.format(date).slice(1)} · ${timeFormatter.format(date)}`;
};

const upperFirst = (text: string) =>
  `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

// Szeptember 12. Szerda, 12:00
export const formatSlotDateTime = (date: Date) => {
  const monthDay = upperFirst(monthDayFormatter.format(date));
  const weekDay = upperFirst(weekDayFormatter.format(date));
  return `${monthDay} ${weekDay}, ${timeFormatter.format(date)}`;
};

// 2026 december 10. Szerda
export const dateWithYearFormatter = new Intl.DateTimeFormat('hu-HU', {
  year: 'numeric',
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

// 2026. dec. 10. 14:30
export const dateTimeWithYearFormatter = new Intl.DateTimeFormat('hu-HU', {
  timeZone: STUDIO_TZ,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
});

// 2026-12-10 14:30 — sortable, for CSV exports. The `sv-SE` locale is the
// standard trick for an ISO-shaped date in a given time zone.
export const csvDateTimeFormatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: STUDIO_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const offsetDateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: STUDIO_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZoneName: 'longOffset',
});

// 2026-10-21 14:32:00+02:00 — the Google Ads offline conversion format. The
// offset comes from the tz rules for that instant (+01:00 winter, +02:00 summer).
export const formatOffsetDateTime = (date: Date) => {
  const parts = Object.fromEntries(
    offsetDateTimeFormatter
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );
  // `longOffset` is "GMT+02:00" (or a bare "GMT" at UTC+0).
  const offset = parts.timeZoneName.replace('GMT', '') || '+00:00';
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}${offset}`;
};

// 2026-12-10_14-30 — for file names; `:` is not allowed in Windows file names.
export const formatFileNameDateTime = (date: Date) =>
  csvDateTimeFormatter.format(date).replace(' ', '_').replace(':', '-');
