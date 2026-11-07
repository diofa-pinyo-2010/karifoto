'use server';

import { revalidateTag } from 'next/cache';

import * as z from 'zod';

import {
  LedgerEntryCategory,
  PaymentMethod,
  StaffProfileRole,
} from '@/generated/prisma/enums';
import { ADMIN_STATS_TAG } from '@/lib/admin-stats';
import { LEDGER_ENTRY_CATEGORY_SIGN } from '@/lib/constants';
import { verifySession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';
import { hufToCents } from '@/lib/utils';

// A fotós-, szerkesztői díj és a bónusz csak kifizetésként keletkezhet (lásd
// `recordStaffPayout`), különben a staff egyenlege nem tudna róla.
const recordExpenseSchema = z.object({
  category: z.enum([
    LedgerEntryCategory.EXPENSE_EQUIPMENT,
    LedgerEntryCategory.EXPENSE_RENT,
    LedgerEntryCategory.EXPENSE_SOFTWARE,
    LedgerEntryCategory.EXPENSE_OTHER,
  ]),
  description: z.string().trim().min(1).max(500),
  amountHuf: z.number().int().positive(),
  method: z.enum(PaymentMethod),
});

export async function recordExpense(
  input: z.input<typeof recordExpenseSchema>,
): Promise<{ success: true } | { error: string }> {
  const { staffProfile } = await verifySession();
  if (staffProfile.role !== StaffProfileRole.SUPERADMIN) {
    return { error: 'Nincs jogosultságod ehhez a művelethez.' };
  }

  const parsed = recordExpenseSchema.safeParse(input);
  if (!parsed.success) {
    console.error(parsed.error.issues);
    return { error: 'Adj meg leírást és pozitív, egész forint összeget.' };
  }
  const { category, description, amountHuf, method } = parsed.data;

  try {
    await prisma.ledgerEntry.create({
      data: {
        category,
        description,
        amountInCents:
          LEDGER_ENTRY_CATEGORY_SIGN[category] * hufToCents(amountHuf),
        method,
      },
    });
  } catch (error) {
    console.error('[expenses] failed to record expense', { error });
    return { error: 'Nem sikerült rögzíteni a kiadást. Próbáld újra.' };
  }

  revalidateTag(ADMIN_STATS_TAG, { expire: 0 });
  return { success: true };
}
