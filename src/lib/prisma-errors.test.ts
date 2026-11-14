import { describe, expect, it } from 'vitest';

import { isUniqueViolationOnField } from '@/lib/prisma-errors';

// The shapes `PrismaClientKnownRequestError.meta` takes for a P2002: Prisma 7
// with `@prisma/adapter-pg` nests the constraint under `driverAdapterError`
// (as an index name when Postgres reports one, else as the key's fields);
// older engines put the fields in `target`.
function adapterMeta(constraint: unknown) {
  return {
    modelName: 'PhotoShooting',
    driverAdapterError: {
      name: 'DriverAdapterError',
      cause: { kind: 'UniqueConstraintViolation', constraint },
    },
  };
}

describe('isUniqueViolationOnField', () => {
  it('matches the index name the pg adapter reports', () => {
    expect(
      isUniqueViolationOnField(
        adapterMeta({ index: 'PhotoShooting_giftCode_key' }),
        'giftCode',
      ),
    ).toBe(true);
  });

  it('matches quoted fields the pg adapter parses from the error detail', () => {
    expect(
      isUniqueViolationOnField(
        adapterMeta({ fields: ['"giftCode"'] }),
        'giftCode',
      ),
    ).toBe(true);
  });

  it('matches a legacy `target` array or string', () => {
    expect(isUniqueViolationOnField({ target: ['giftCode'] }, 'giftCode')).toBe(
      true,
    );
    expect(
      isUniqueViolationOnField(
        { target: 'PhotoShooting_giftCode_key' },
        'giftCode',
      ),
    ).toBe(true);
  });

  // A double-sold slot also surfaces as P2002 inside the same transaction, and
  // must not be mistaken for a gift-code collision and retried.
  it('does not match a violation on another column', () => {
    expect(
      isUniqueViolationOnField(
        adapterMeta({ index: 'PhotoShooting_timeSlotId_key' }),
        'giftCode',
      ),
    ).toBe(false);
    expect(
      isUniqueViolationOnField({ target: ['timeSlotId'] }, 'giftCode'),
    ).toBe(false);
  });

  it('does not match missing or malformed meta', () => {
    expect(isUniqueViolationOnField(undefined, 'giftCode')).toBe(false);
    expect(isUniqueViolationOnField(null, 'giftCode')).toBe(false);
    expect(isUniqueViolationOnField({}, 'giftCode')).toBe(false);
    expect(isUniqueViolationOnField(adapterMeta(undefined), 'giftCode')).toBe(
      false,
    );
  });
});
