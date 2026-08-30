export const weekDayFormatter = new Intl.DateTimeFormat('hu-Hu', {
  timeZone: 'Europe/Budapest',
  weekday: 'long',
});

export const shortDateFormatter = new Intl.DateTimeFormat('hu-Hu', {
  timeZone: 'Europe/Budapest',
  month: 'short',
  day: 'numeric',
});

export const timeFormatter = new Intl.DateTimeFormat('hu-Hu', {
  timeZone: 'Europe/Budapest',
  hour: 'numeric',
  minute: 'numeric',
});

export const shortFullDateFormatter = new Intl.DateTimeFormat('hu-Hu', {
  timeZone: 'Europe/Budapest',
  month: 'short',
  day: 'numeric',
  weekday: 'long',
  hour: 'numeric',
  minute: 'numeric',
});
