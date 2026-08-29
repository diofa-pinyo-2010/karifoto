import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatMoney = (cents: number) => {
  return `${new Intl.NumberFormat('hu-HU').format(cents / 100)} Ft`;
};

export const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);
