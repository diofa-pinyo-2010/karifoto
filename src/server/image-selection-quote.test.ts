import { describe, expect, it } from 'vitest';

import { quoteImageSelection } from '@/server/image-selection-quote';

const pricing = {
  extraEditedImageRateInCents: 2000_00,
  extraRetouchedImageRateInCents: 3000_00,
  packageEditedImagesAllowance: 10,
};

describe('quoteImageSelection', () => {
  it('costs nothing at or under the allowance with no retouching', () => {
    expect(
      quoteImageSelection({ pricing, editedImages: 10, retouchedImages: 0 }),
    ).toEqual({ lines: [], extraInCents: 0 });
  });

  it('charges only the images above the allowance', () => {
    const { lines, extraInCents } = quoteImageSelection({
      pricing,
      editedImages: 12,
      retouchedImages: 0,
    });
    expect(lines).toHaveLength(1);
    expect(extraInCents).toBe(2 * 2000_00);
  });

  it('charges retouching even inside the allowance', () => {
    expect(
      quoteImageSelection({ pricing, editedImages: 5, retouchedImages: 2 })
        .extraInCents,
    ).toBe(2 * 3000_00);
  });

  it('adds both kinds up', () => {
    const { lines, extraInCents } = quoteImageSelection({
      pricing,
      editedImages: 13,
      retouchedImages: 1,
    });
    expect(lines).toHaveLength(2);
    expect(extraInCents).toBe(3 * 2000_00 + 3000_00);
  });
});
