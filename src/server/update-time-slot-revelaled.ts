'use server';

import { revalidatePath } from 'next/cache';

import { prisma } from '@/lib/prisma';

export async function updateTimeSlotRevealed(id: string, revealed: boolean) {
  try {
    await prisma.timeSlot.update({ where: { id }, data: { revealed } });
  } catch (error) {
    console.error(error);
  }

  revalidatePath('/admin/time-slots');
}
