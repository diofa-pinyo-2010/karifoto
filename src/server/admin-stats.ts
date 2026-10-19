'use server';

import { revalidateTag } from 'next/cache';

import { StaffProfileRole } from '@/generated/prisma/enums';
import { ADMIN_STATS_TAG } from '@/lib/admin-stats';
import { verifySession } from '@/lib/dal';

export async function refreshAdminStats(): Promise<
  { success: true } | { error: string }
> {
  const { staffProfile } = await verifySession();
  if (staffProfile.role !== StaffProfileRole.SUPERADMIN) {
    return { error: 'Nincs jogosultságod ehhez a művelethez.' };
  }

  // `{ expire: 0 }`: a következő render megvárja a friss adatot, nem a régit kapja.
  revalidateTag(ADMIN_STATS_TAG, { expire: 0 });

  return { success: true };
}
