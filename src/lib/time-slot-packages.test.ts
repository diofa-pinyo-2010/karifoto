import { describe, expect, it } from 'vitest';

import { Package } from '@/generated/prisma/enums';
import {
  initialPackageForSlot,
  isPackageAllowed,
} from '@/lib/time-slot-packages';

describe('isPackageAllowed', () => {
  it('allows every package when the list is empty', () => {
    for (const pkg of Object.values(Package)) {
      expect(isPackageAllowed([], pkg)).toBe(true);
    }
  });

  it('allows only the listed packages when restricted', () => {
    expect(isPackageAllowed([Package.MINI], Package.MINI)).toBe(true);
    expect(isPackageAllowed([Package.MINI], Package.CLASSIC)).toBe(false);
  });
});

describe('initialPackageForSlot', () => {
  it('keeps an allowed selection', () => {
    expect(initialPackageForSlot([], Package.FAMILY)).toBe(Package.FAMILY);
    expect(
      initialPackageForSlot([Package.MINI, Package.CLASSIC], Package.CLASSIC),
    ).toBe(Package.CLASSIC);
  });

  it('falls back to the only allowed package when the selection is not allowed', () => {
    expect(initialPackageForSlot([Package.MINI], Package.FAMILY)).toBe(
      Package.MINI,
    );
  });

  it('preselects the only allowed package when nothing was selected', () => {
    expect(initialPackageForSlot([Package.MINI], null)).toBe(Package.MINI);
  });

  it('leaves the choice open when several packages are allowed', () => {
    expect(
      initialPackageForSlot([Package.MINI, Package.CLASSIC], Package.FAMILY),
    ).toBeNull();
    expect(initialPackageForSlot([], null)).toBeNull();
  });
});
