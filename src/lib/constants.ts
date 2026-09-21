import {
  DecorSet,
  LedgerEntryCategory,
  Package,
  PaymentMethod,
  PhotoShootingStatus,
} from '@/generated/prisma/enums';

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

export const UPCOMING_SHOOTINGS_TO_SHOW = 10;

export const TIME_SLOT_DURATION_MINUTES = 60;

export const PACKAGE_LABEL: Record<Package, string> = {
  MINI: 'Mini',
  CLASSIC: 'Classic',
  FAMILY: 'Family',
};

export const DECOR_SET_LABEL: Record<DecorSet, string> = {
  HOFEHER: 'Hófehér',
  ALOMKASTELY: 'Álomkastély',
};

export const PHOTO_SHOOTING_STATUS_LABEL: Record<PhotoShootingStatus, string> =
  {
    PHOTOGRAPHER_SELECTION: 'Fotós kiválasztása',
    RAW_PHOTOS_UPLOAD: 'Nyers képek feltöltése',
    USER_SELECTION: 'Ügyfél válogatás',
    EDITOR_SELECTION: 'Szerkesztő kiválasztása',
    FINAL_PHOTOS_UPLOAD: 'Végleges képek feltöltése',
    WAITING_FOR_PAYMENT: 'Hiányzó befizetés',
    COMPLETED: 'Teljesített',
    CLOSED: 'Bezárt',
  };

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CARD: 'Bankkártya',
  TRANSFER: 'Átutalás',
  CASH: 'Készpénz',
};

export const LEDGER_ENTRY_CATEGORY_LABEL: Record<LedgerEntryCategory, string> =
  {
    INCOME_CLIENT_PAYMENT_DEPOSIT: 'Előleg',
    INCOME_CLIENT_PAYMENT_BALANCE: 'Egyenleg',
    INCOME_CLIENT_PAYMENT_EXTRA: 'Extra díj',
    INCOME_OTHER: 'Egyéb bevétel',
    EXPENSE_PHOTOGRAPHER_FEE: 'Fotós díja',
    EXPENSE_EDITOR_FEE: 'Szerkesztő díja',
    EXPENSE_EQUIPMENT: 'Eszköz',
    EXPENSE_RENT: 'Bérleti díj',
    EXPENSE_SOFTWARE: 'Szoftver',
    EXPENSE_OTHER: 'Egyéb kiadás',
  };
