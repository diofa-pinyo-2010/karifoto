import { describe, expect, it } from 'vitest';

import { PhotoShootingStatus } from '@/generated/prisma/enums';
import { isBalanceDueInStudio } from '@/lib/balance-due';

describe('isBalanceDueInStudio', () => {
  it.each([
    PhotoShootingStatus.PHOTOGRAPHER_SELECTION,
    PhotoShootingStatus.WAITING_FOR_THE_DATE,
    PhotoShootingStatus.WAITING_FOR_BALANCE_PAYMENT,
  ])('shows the balance before it is paid (%s)', (status) => {
    expect(
      isBalanceDueInStudio({ status, totalToBePaidInCents: 10000_00 }),
    ).toBe(true);
  });

  it('hides it on a cancelled shooting even with money owed', () => {
    expect(
      isBalanceDueInStudio({
        status: PhotoShootingStatus.CANCELLED,
        totalToBePaidInCents: 10000_00,
      }),
    ).toBe(false);
  });

  it.each([
    PhotoShootingStatus.RAW_PHOTOS_UPLOAD,
    PhotoShootingStatus.WAITING_FOR_EXTRA_PAYMENT,
    PhotoShootingStatus.COMPLETED,
  ])('hides it once the balance phase is over (%s)', (status) => {
    expect(
      isBalanceDueInStudio({ status, totalToBePaidInCents: 10000_00 }),
    ).toBe(false);
  });

  it.each([0, -500_00, null])(
    'hides it when nothing is owed (%s)',
    (totalToBePaidInCents) => {
      expect(
        isBalanceDueInStudio({
          status: PhotoShootingStatus.WAITING_FOR_BALANCE_PAYMENT,
          totalToBePaidInCents,
        }),
      ).toBe(false);
    },
  );
});
