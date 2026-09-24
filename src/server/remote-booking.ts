'use server';

import { redirect } from 'next/navigation';

import { prisma } from '@/lib/prisma';
import {
  createBookingIntent,
  type CreateBookingIntentInput,
} from '@/server/booking-intent';
import {
  createTimeSlot,
  deleteTimeSlot,
  updateTimeSlotRevealed,
} from '@/server/time-slots';

export type CreateRemoteBookingIntentInput = Omit<
  CreateBookingIntentInput,
  'timeSlotId'
> & {
  startTime: Date;
};

export async function createRemoteBookingIntent(
  input: CreateRemoteBookingIntentInput,
): Promise<{ error: string }> {
  // Reuse an existing free slot at this start time (whatever its revealed
  // status) instead of creating a duplicate one.
  const existingTimeSlot = await prisma.timeSlot.findFirst({
    where: { startTime: input.startTime, photoShooting: null },
  });

  let timeSlotId: string;
  if (existingTimeSlot != null) {
    // `revealed: false` keeps the slot off the public "free" listing — it still
    // shows up as taken, so no one else can book it.
    await updateTimeSlotRevealed(existingTimeSlot.id, false);
    timeSlotId = existingTimeSlot.id;
  } else {
    const timeSlot = await createTimeSlot(input.startTime, false);
    if ('error' in timeSlot) {
      return timeSlot;
    }
    timeSlotId = timeSlot.id;
  }

  const bookingIntent = await createBookingIntent({
    ...input,
    timeSlotId,
  });

  if ('error' in bookingIntent) {
    if (existingTimeSlot == null) {
      await deleteTimeSlot(timeSlotId);
    }
    return bookingIntent;
  }

  redirect(`/admin/summary/${bookingIntent.id}`);
}
