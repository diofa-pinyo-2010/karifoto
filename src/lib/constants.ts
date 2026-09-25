import {
  DecorSet,
  LedgerEntryCategory,
  Package,
  PaymentMethod,
  PhotoShootingStatus,
} from '@/generated/prisma/enums';

import type { ComboboxFieldItem } from '@/components/EditableComboboxField';

export const STUDIO_TZ = 'Europe/Budapest';

export const SITE_NAME = 'Karifoto';

export const STUDIO_ADDRESS = '1056 Budapest, Irányi utca 9. I. emelet 4.';

export const YES_NO_VALUES = ['IGEN', 'NEM'] as const;
export type YesNoValue = (typeof YES_NO_VALUES)[number];

export const YES_NO_COMBOBOX_ITEMS: ComboboxFieldItem[] = YES_NO_VALUES.map(
  (value) => ({ label: value, value }),
);

export function booleanToYesNo(value: boolean): YesNoValue {
  return value ? 'IGEN' : 'NEM';
}

export const LIGHT_PLAY_FEE = 15000_00;
export const EXTRA_FEE_PER_EXTRA_PERSON = 5000_00;
export const EXTRA_FEE_PER_PET = 5000_00;
export const MAX_PERSONS = 8;
export const MAX_PETS = 8;
export const PERSONS_INCLUDED = 5;
export const DEPOSIT_AMOUNT = 10000_00;
export const EXTRA_EDIT_PER_IMAGE = 2000_00;
export const EXTRA_RETOUCH_PER_IMAGE = 3000_00;

export const PHOTO_DELIVERY_DEADLINE_DAYS_AFTER_CLIENT_MADE_SELECTION = 7;

export const PACKAGE_PRICES = {
  MINI: {
    base: 39000_00,
    studio: 6000_00,
    editedImagesAllowance: 10,
  },
  CLASSIC: {
    base: 49000_00,
    studio: 9000_00,
    editedImagesAllowance: 15,
  },
  FAMILY: {
    base: 59000_00,
    studio: 12000_00,
    editedImagesAllowance: 20,
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

// A PENDING BookingIntent touched within this window may still have a live
// Stripe Checkout session (default expiry: 24h), so its slot counts as held.
export const PENDING_INTENT_HOLD_HOURS = 24;

export const PACKAGE_LABEL: Record<Package, string> = {
  MINI: 'Mini',
  CLASSIC: 'Classic',
  FAMILY: 'Family',
};

export const DECOR_SET_LABEL: Record<DecorSet, string> = {
  HOFEHER: 'Hófehér',
  ALOMKASTELY: 'Álomkastély',
};

export const DECOR_SET_COMBOBOX_ITEMS: ComboboxFieldItem[] = Object.entries(
  DECOR_SET_LABEL,
).map(([value, label]) => ({ value, label }));

export const PHOTO_SHOOTING_STATUS_LABEL: Record<PhotoShootingStatus, string> =
  {
    PHOTOGRAPHER_SELECTION: 'Fotós kiválasztása',
    WAITING_FOR_THE_DATE: 'Várunk a fotózásra',
    RAW_PHOTOS_UPLOAD: 'Nyers képek feltöltése',
    USER_SELECTION: 'Ügyfél válogatás',
    EDITOR_SELECTION: 'Szerkesztő kiválasztása',
    FINAL_PHOTOS_UPLOAD: 'Végleges képek feltöltése',
    WAITING_FOR_PAYMENT: 'Hiányzó befizetés',
    COMPLETED: 'Teljesített',
    CLOSED: 'Bezárt',
  };

// Bg opacity/text-lightness pairs mirror the `destructive` Badge variant
// (bg-*/10 + darker text in light mode, bg-*/20 + lighter text in dark mode) —
// lighter text on a dim background reads better in dark mode than the light-mode shade.
const IN_PROGRESS_BADGE_CLASSNAME =
  'bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400 border border-yellow-500/80 dark:border-yellow-500/40 uppercase font-mono font-medium';

const NOTHING_TO_DO_BADGE_CLASSNAME =
  'bg-green-500/10 text-green-600 dark:bg-green-500/20 border border-green-500/80 dark:border-green-500/40 dark:text-green-400 uppercase font-mono font-medium';

export const PHOTO_SHOOTING_STATUS_BADGE_CLASSNAME: Record<
  PhotoShootingStatus,
  string
> = {
  PHOTOGRAPHER_SELECTION: IN_PROGRESS_BADGE_CLASSNAME,
  RAW_PHOTOS_UPLOAD: IN_PROGRESS_BADGE_CLASSNAME,
  USER_SELECTION: IN_PROGRESS_BADGE_CLASSNAME,
  EDITOR_SELECTION: IN_PROGRESS_BADGE_CLASSNAME,
  FINAL_PHOTOS_UPLOAD: IN_PROGRESS_BADGE_CLASSNAME,
  WAITING_FOR_PAYMENT: IN_PROGRESS_BADGE_CLASSNAME,

  WAITING_FOR_THE_DATE: NOTHING_TO_DO_BADGE_CLASSNAME,
  COMPLETED: NOTHING_TO_DO_BADGE_CLASSNAME,

  CLOSED:
    'bg-red-500/10 text-red-600 dark:bg-red-500/20 border border-red-500/80 dark:border-red-500/40 dark:text-red-400 uppercase font-mono font-medium',
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CARD: 'Bankkártya',
  TRANSFER: 'Átutalás',
  CASH: 'Készpénz',
};

export const LEDGER_ENTRY_CATEGORY_LABEL: Record<LedgerEntryCategory, string> =
  {
    INCOME_CLIENT_PAYMENT_DEPOSIT: 'Előleg',
    INCOME_CLIENT_PAYMENT_BALANCE: 'Fennmaradó befizetés',
    INCOME_CLIENT_PAYMENT_EXTRA: 'Extra díj',
    INCOME_OTHER: 'Egyéb bevétel',
    EXPENSE_PHOTOGRAPHER_FEE: 'Fotós díja',
    EXPENSE_EDITOR_FEE: 'Szerkesztő díja',
    EXPENSE_EQUIPMENT: 'Eszköz',
    EXPENSE_RENT: 'Bérleti díj',
    EXPENSE_SOFTWARE: 'Szoftver',
    EXPENSE_OTHER: 'Egyéb kiadás',
  };

export const APP_URLS = {
  photoShootingAdminPage: (shootingId: string) =>
    `/admin/photo-shootings/${shootingId}`,
  upcomingShootings: '/admin/bookings',
};
