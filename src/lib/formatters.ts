// szerda
export const weekDayFormatter = new Intl.DateTimeFormat('hu-Hu', {
  timeZone: 'Europe/Budapest',
  weekday: 'long',
});

// dec. 1.
export const shortDateFormatter = new Intl.DateTimeFormat('hu-Hu', {
  timeZone: 'Europe/Budapest',
  month: 'short',
  day: 'numeric',
});

// 12:00
export const timeFormatter = new Intl.DateTimeFormat('hu-Hu', {
  timeZone: 'Europe/Budapest',
  hour: 'numeric',
  minute: '2-digit',
});

// nov. 1., vasárnap 10:00
export const shortFullDateFormatter = new Intl.DateTimeFormat('hu-Hu', {
  timeZone: 'Europe/Budapest',
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
