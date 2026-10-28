import { BookingIntentStatus } from '@/generated/prisma/enums';
import { PENDING_INTENT_HOLD_HOURS } from '@/lib/constants';

import type { Prisma } from '@/generated/prisma/client';

export function livePendingIntentWhere() {
  return {
    status: BookingIntentStatus.PENDING,
    updatedAt: {
      gt: new Date(Date.now() - PENDING_INTENT_HOLD_HOURS * 60 * 60 * 1000),
    },
  } satisfies Prisma.BookingIntentWhereInput;
}
