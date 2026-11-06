import { describe, expect, it } from 'vitest';

import { Package } from '@/generated/prisma/enums';
import {
  buildPhotographerBadgeClassNames,
  hasLightPlay,
  isLightPlayChargeable,
} from '@/lib/constants';

describe('buildPhotographerBadgeClassNames', () => {
  it('gives each of five photographers a different color', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const classNames = buildPhotographerBadgeClassNames(ids);

    expect(new Set(ids.map((id) => classNames.get(id))).size).toBe(5);
  });

  it('wraps around instead of leaving the sixth without a color', () => {
    const classNames = buildPhotographerBadgeClassNames([
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
    ]);

    expect(classNames.get('f')).toBe(classNames.get('a'));
  });

  it('has no color for an id that was not passed', () => {
    expect(buildPhotographerBadgeClassNames(['a']).get('b')).toBeUndefined();
  });
});

describe('light play', () => {
  describe('isLightPlayChargeable', () => {
    it('charges a fee on packages that do not include it', () => {
      expect(isLightPlayChargeable(Package.MINI)).toBe(true);
      expect(isLightPlayChargeable(Package.CLASSIC)).toBe(true);
    });

    it('never charges a fee on FAMILY, which already contains it', () => {
      expect(isLightPlayChargeable(Package.FAMILY)).toBe(false);
    });
  });

  describe('hasLightPlay', () => {
    it('follows the client choice on packages that charge for it', () => {
      expect(hasLightPlay(Package.MINI, true)).toBe(true);
      expect(hasLightPlay(Package.MINI, false)).toBe(false);
      expect(hasLightPlay(Package.CLASSIC, true)).toBe(true);
      expect(hasLightPlay(Package.CLASSIC, false)).toBe(false);
    });

    it('is true for FAMILY even when nothing was selected', () => {
      expect(hasLightPlay(Package.FAMILY, false)).toBe(true);
    });
  });

  // The whole reason these are two functions rather than one. Collapsing them
  // either bills a FAMILY client for something their package already includes,
  // or hides the light play from a booking that genuinely has it.
  it('answers the two questions differently for FAMILY', () => {
    expect(isLightPlayChargeable(Package.FAMILY)).toBe(false);
    expect(hasLightPlay(Package.FAMILY, false)).toBe(true);
  });

  it('covers every package in the enum', () => {
    for (const pkg of Object.values(Package)) {
      expect(typeof isLightPlayChargeable(pkg)).toBe('boolean');
      expect(typeof hasLightPlay(pkg, false)).toBe('boolean');
    }
  });
});
