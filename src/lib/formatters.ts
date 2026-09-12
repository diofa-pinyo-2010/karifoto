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

// szeptember 13.
export const monthDayFormatter = new Intl.DateTimeFormat('hu-Hu', {
  timeZone: 'Europe/Budapest',
  month: 'long',
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

const upperFirst = (text: string) =>
  `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

// Szeptember 12. Szerda, 12:00
export const formatSlotDateTime = (date: Date) => {
  const monthDay = upperFirst(monthDayFormatter.format(date));
  const weekDay = upperFirst(weekDayFormatter.format(date));
  return `${monthDay} ${weekDay}, ${timeFormatter.format(date)}`;
};
