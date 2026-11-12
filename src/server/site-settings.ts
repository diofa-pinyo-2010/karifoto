'use server';

import { revalidatePath } from 'next/cache';

import * as z from 'zod';

import { StaffProfileRole } from '@/generated/prisma/enums';
import { APP_URLS, SITE_SETTINGS_TABLE_ID } from '@/lib/constants';
import { verifySession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';
import { invalidatePublicTimeSlots } from '@/lib/public-time-slots';
import { hufToCents } from '@/lib/utils';

export async function setAutomaticEarlyBirdEnabled(
  enabled: boolean,
): Promise<{ success: true } | { error: string }> {
  const { staffProfile } = await verifySession();
  if (staffProfile.role !== StaffProfileRole.SUPERADMIN) {
    return { error: 'Nincs jogosultságod ehhez a művelethez.' };
  }

  const parsed = z.boolean().safeParse(enabled);
  if (!parsed.success) {
    console.error(parsed.error.issues);
    return { error: 'Érvénytelen érték.' };
  }

  try {
    await prisma.siteSettings.upsert({
      where: { id: SITE_SETTINGS_TABLE_ID },
      update: { automaticEarlyBirdEnabled: parsed.data },
      create: { automaticEarlyBirdEnabled: parsed.data },
    });

    revalidatePath('/admin/settings');
  } catch (err) {
    console.error(err);
    return {
      error:
        'Nem sikerült menteni az automatikus early bird beállítást a szerveren.',
    };
  }

  return { success: true };
}

export async function setDailyChange(
  amountHuf: number,
): Promise<{ success: true } | { error: string }> {
  const { staffProfile } = await verifySession();
  if (staffProfile.role !== StaffProfileRole.SUPERADMIN) {
    return { error: 'Nincs jogosultságod ehhez a művelethez.' };
  }

  const parsed = z.number().int().nonnegative().safeParse(amountHuf);
  if (!parsed.success) {
    console.error(parsed.error.issues);
    return { error: 'Add meg a váltót forintban.' };
  }

  const dailyChangeInCents = hufToCents(parsed.data);
  try {
    await prisma.siteSettings.upsert({
      where: { id: SITE_SETTINGS_TABLE_ID },
      update: { dailyChangeInCents },
      create: { dailyChangeInCents },
    });

    revalidatePath('/admin/settings');
    revalidatePath(APP_URLS.today);
  } catch (err) {
    console.error(err);
    return { error: 'Nem sikerült menteni a napi váltót a szerveren.' };
  }

  return { success: true };
}

/**
 * Az early bird / last minute határnap (yyyy-MM-dd). Az ennél a napnál
 * (budapesti éjfél) korábban kezdődő idősávok számítanak early birdnek. Mentés
 * után a főoldali idősáv-cache ürül, így egy oldalfrissítés már az új
 * felosztást mutatja — nem kell hozzá deploy.
 */
export async function setEarlyBirdDeadline(
  dayKey: string,
): Promise<{ success: true } | { error: string }> {
  const { staffProfile } = await verifySession();
  if (staffProfile.role !== StaffProfileRole.SUPERADMIN) {
    return { error: 'Nincs jogosultságod ehhez a művelethez.' };
  }

  const parsed = z.iso.date().safeParse(dayKey);
  if (!parsed.success) {
    console.error(parsed.error.issues);
    return { error: 'Érvénytelen dátum.' };
  }

  // DATE oszlop: a Prisma UTC éjfélként írja, tehát pontosan ez a nap kerül be.
  const earlyBirdDeadline = new Date(`${parsed.data}T00:00:00Z`);
  try {
    await prisma.siteSettings.upsert({
      where: { id: SITE_SETTINGS_TABLE_ID },
      update: { earlyBirdDeadline },
      create: { earlyBirdDeadline },
    });

    invalidatePublicTimeSlots();
    revalidatePath('/admin/settings');
  } catch (err) {
    console.error(err);
    return {
      error: 'Nem sikerült menteni az early bird határidőt a szerveren.',
    };
  }

  return { success: true };
}
