import { PhotoShootingStatus } from '@/generated/prisma/enums';
import { isStatusBefore } from '@/lib/constants';

/**
 * Whether the client portal should show the amount still to pay in the studio
 * (card or cash). Only the balance phase counts: extras owed after delivery go
 * through Stripe, so they must not be offered at the till.
 *
 * `CANCELLED` is checked explicitly because `isStatusBefore()` answers `true`
 * for it. `null` means the shooting has no price snapshot to compute from.
 */
export function isBalanceDueInStudio({
  status,
  totalToBePaidInCents,
}: {
  status: PhotoShootingStatus;
  totalToBePaidInCents: number | null;
}) {
  return (
    status !== PhotoShootingStatus.CANCELLED &&
    isStatusBefore(status, 'RAW_PHOTOS_UPLOAD') &&
    totalToBePaidInCents != null &&
    totalToBePaidInCents > 0
  );
}
