'use server';

import { redirect } from 'next/navigation';

import {
  createBookingIntent,
  type CreateBookingIntentInput,
} from '@/server/booking-intent';
import { createTimeSlot, deleteTimeSlot } from '@/server/time-slots';

export type CreateRemoteBookingIntentInput = Omit<
  CreateBookingIntentInput,
  'timeSlotId'
> & {
  startTime: Date;
};

export async function createRemoteBookingIntent(
  input: CreateRemoteBookingIntentInput,
): Promise<{ error: string }> {
  // `revealed: false` keeps the slot off the public "free" listing — it still
  // shows up as taken, so no one else can book it.
  const timeSlot = await createTimeSlot(input.startTime, false);
  if ('error' in timeSlot) {
    return timeSlot;
  }

  const bookingIntent = await createBookingIntent({
    ...input,
    timeSlotId: timeSlot.id,
  });

  if ('error' in bookingIntent) {
    await deleteTimeSlot(timeSlot.id);
    return bookingIntent;
  }

  redirect(`/admin/summary/${bookingIntent.id}`);
}
