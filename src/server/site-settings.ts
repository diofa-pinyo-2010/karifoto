'use server';

import { revalidatePath } from 'next/cache';

import * as z from 'zod';

import { StaffProfileRole } from '@/generated/prisma/enums';
import { SITE_SETTINGS_TABLE_ID } from '@/lib/constants';
import { verifySession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';

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
