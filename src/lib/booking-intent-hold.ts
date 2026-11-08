import { BookingIntentStatus } from '@/generated/prisma/enums';
import { PENDING_INTENT_HOLD_MINUTES } from '@/lib/constants';

import type { Prisma } from '@/generated/prisma/client';

export function livePendingIntentWhere() {
  return {
    status: BookingIntentStatus.PENDING,
    updatedAt: {
      gt: new Date(Date.now() - PENDING_INTENT_HOLD_MINUTES * 60 * 1000),
    },
  } satisfies Prisma.BookingIntentWhereInput;
}
