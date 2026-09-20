import { LedgerEntryCategory } from '@/generated/prisma/enums';

export const SITE_NAME = 'Karifoto';

export const LIGHT_PLAY_FEE = 15000_00;
export const EXTRA_FEE_PER_EXTRA_PERSON = 5000_00;
export const EXTRA_FEE_PER_PET = 5000_00;
export const MAX_PERSONS = 8;
export const MAX_PETS = 8;
export const PERSONS_INCLUDED = 5;
export const DEPOSIT_AMOUNT = 10000_00;

export const PHOTO_DELIVERY_DEADLINE_DAYS_AFTER_CLIENT_MADE_SELECTION = 7;

export const PACKAGE_PRICES = {
  MINI: {
    base: 39000_00,
    studio: 6000_00,
  },
  CLASSIC: {
    base: 49000_00,
    studio: 9000_00,
  },
  FAMILY: {
    base: 59000_00,
    studio: 12000_00,
  },
};

// LedgerEntry.amountInCents is signed: positive = income, negative = expense.
// Callers pass a positive raw amount; this maps it to the correct sign.
export const LEDGER_ENTRY_CATEGORY_SIGN: Record<LedgerEntryCategory, 1 | -1> = {
  INCOME_CLIENT_PAYMENT_DEPOSIT: 1,
  INCOME_CLIENT_PAYMENT_BALANCE: 1,
  INCOME_CLIENT_PAYMENT_EXTRA: 1,
  INCOME_OTHER: 1,
  EXPENSE_PHOTOGRAPHER_FEE: -1,
  EXPENSE_EDITOR_FEE: -1,
  EXPENSE_EQUIPMENT: -1,
  EXPENSE_RENT: -1,
  EXPENSE_SOFTWARE: -1,
  EXPENSE_OTHER: -1,
};
