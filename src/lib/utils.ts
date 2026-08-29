import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { TimeSlotsWithPhotoShooting } from '@/server/time-slots';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatMoney = (cents: number) => {
  return `${new Intl.NumberFormat('hu-HU').format(cents / 100)} Ft`;
};

export const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Budapest',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export const groupSlotsByDay = (slots: TimeSlotsWithPhotoShooting[]) => {
  const groups = new Map<string, TimeSlotsWithPhotoShooting[]>();

  for (const slot of slots) {
    const dayKey = dayKeyFormatter.format(slot.startTime);
    const daySlots = groups.get(dayKey);
    if (daySlots) {
      daySlots.push(slot);
    } else {
      groups.set(dayKey, [slot]);
    }
  }

  return groups;
};

export type GroupedSlots = ReturnType<typeof groupSlotsByDay>;
