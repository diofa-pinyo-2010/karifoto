import type { SumupCheckoutAttemptStatus } from '@/generated/prisma/enums';
import type { TransactionStatus } from '@sumup/sdk';

const STATUS_MAP = {
  SUCCESSFUL: 'SUCCESSFUL',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  PENDING: 'PENDING',
  REFUNDED: null,
} satisfies Record<TransactionStatus, SumupCheckoutAttemptStatus | null>;

export function toAttemptStatus(status: TransactionStatus) {
  return STATUS_MAP[status];
}
