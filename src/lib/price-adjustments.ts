import 'server-only';
import { PriceAdjustmentType } from '@/generated/prisma/enums';
import { EARLY_BIRD_DISCOUNT_AMOUNT } from '@/lib/constants';
import { prisma } from '@/lib/prisma';

export async function attachEarlyBirdDiscount(
  bookingIntentId: string,
): Promise<{ success: true } | { error: string }> {
  try {
    await prisma.priceAdjustment.create({
      data: {
        type: PriceAdjustmentType.DISCOUNT,
        amountInCents: EARLY_BIRD_DISCOUNT_AMOUNT,
        publicLabel: 'Early Bird kedvezmény 🎉',
        internalNote: 'Automatikus early bird kedvezmény.',
        bookingIntent: { connect: { id: bookingIntentId } },
      },
      select: { id: true },
    });

    return { success: true };
  } catch (err) {
    console.error(err);
    return {
      error: `Nem sikerült elmenteni az automatikus early bird-öt, és hozzáadni a booking intenthez. bi ID:${bookingIntentId}`,
    };
  }
}
