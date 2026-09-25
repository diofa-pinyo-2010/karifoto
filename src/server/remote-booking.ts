'use server';

import { redirect } from 'next/navigation';

import { getOrCreateTimeSlot } from '@/lib/get-or-create-time-slot';
import {
  createBookingIntent,
  type CreateBookingIntentInput,
} from '@/server/booking-intent';
import { deleteTimeSlot } from '@/server/time-slots';

export type CreateRemoteBookingIntentInput = Omit<
  CreateBookingIntentInput,
  'timeSlotId'
> & {
  startTime: Date;
};

export async function createRemoteBookingIntent(
  input: CreateRemoteBookingIntentInput,
): Promise<{ error: string }> {
  const timeSlot = await getOrCreateTimeSlot(input.startTime);
  if ('error' in timeSlot) {
    return timeSlot;
  }

  const bookingIntent = await createBookingIntent({
    ...input,
    timeSlotId: timeSlot.id,
  });

  if ('error' in bookingIntent) {
    if (timeSlot.created) {
      await deleteTimeSlot(timeSlot.id);
    }
    return bookingIntent;
  }

  redirect(`/admin/summary/${bookingIntent.id}`);
}
