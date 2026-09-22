import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatMoney = (cents: number) => {
  return `${new Intl.NumberFormat('hu-HU', { useGrouping: 'always' }).format(cents / 100)} Ft`;
};

export const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Budapest',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export const groupByDay = <T>(
  items: T[],
  getDate: (item: T) => Date,
): Map<string, T[]> => {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const dayKey = dayKeyFormatter.format(getDate(item));
    const daySlots = groups.get(dayKey);
    if (daySlots) {
      daySlots.push(item);
    } else {
      groups.set(dayKey, [item]);
    }
  }

  return groups;
};

export type GroupedSlots<T> = Map<string, T[]>;

function formatGoogleCalendarDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function generateAddToGoogleCalendarLink({
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
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatGoogleCalendarDate(startTime)}/${formatGoogleCalendarDate(endTime)}`,
    ...(description && { details: description }),
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
