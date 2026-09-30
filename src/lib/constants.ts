import {
  DecorSet,
  InvoiceStatus,
  LedgerEntryCategory,
  Package,
  PaymentMethod,
  PhotoShootingStatus,
  PriceAdjustmentType,
} from '@/generated/prisma/enums';

import type { ComboboxFieldItem } from '@/components/EditableComboboxField';

export const BASE_URL_PROD = 'https://karifoto.hu';

export const STUDIO_TZ = 'Europe/Budapest';

export const SITE_NAME = 'Karifoto';

export const STUDIO_ADDRESS = '1056 Budapest, Irányi utca 9. I. emelet 4.';

/**
 * A stúdió Google-térkép beágyazása, a fenti címből származtatva — így egy
 * forrásból jön a cím és a térkép pin.
 *
 * Szándékosan nem a "Share → Embed a map" által adott `pb=` paraméteres URL:
 * az egy átlátszatlan, generált blob, amit kézzel nem lehet előállítani, és ha
 * elavul, a Google "Invalid 'pb' parameter" hibával utasítja el. Az
 * `output=embed` forma sima lekérdezést vár, és nem kell hozzá API-kulcs.
 *
 * Az iframe `loading="lazy"`, tehát csak akkor kér le bármit a Google-tól, ha a
 * szekció a nézetbe kerül — de a videóval ellentétben nem kattintásra tölt. Az
 * adatkezelési tájékoztató tervezete is így írja le.
 */
/**
 * Térkép nagyítás. Egész szám, nagyobb érték = közelebb:
 *   13 kerület · 15 utcák · 17 háztömb · 18 épület · 20 maximum
 */
export const STUDIO_MAP_ZOOM = 16;

export const STUDIO_MAP_EMBED_URL = `https://www.google.com/maps?q=${encodeURIComponent(
  STUDIO_ADDRESS,
)}&z=${STUDIO_MAP_ZOOM}&output=embed`;

export const STUDIO_MAP_LINK = 'https://maps.app.goo.gl/MLT1TbNYy8n1JMFKA';

export const VIDEO_URL = 'https://youtube.com/shorts/4xeHvJ1_7yE';

/**
 * Ugyanaz a videó beágyazható alakban. `youtube-nocookie.com`, és csak a
 * lejátszógomb megnyomása után kerül a DOM-ba — így az oldal betöltése nem
 * létesít kapcsolatot a Google-lel. Az adatkezelési tájékoztató tervezete is
 * pontosan ezt a működést írja le.
 */
export const VIDEO_EMBED_URL =
  'https://www.youtube-nocookie.com/embed/4xeHvJ1_7yE?autoplay=1';

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

export const PRICE_ADJUSTMENT_TYPE_LABEL: Record<PriceAdjustmentType, string> =
  {
    DISCOUNT: 'Kedvezmény',
    DEDUCTION: 'Fizetés eltérés',
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

/*
 * A munkafolyamat sorrendje, kimondva. Eddig két helyen élt implicit módon: az
 * enum felsorolási sorrendjében (prisma/schema.prisma) és a `resolveStatus()`
 * if-láncában (src/server/admin.ts) — egyik sem alkalmas összehasonlításra, és
 * az enum sorrendjére támaszkodni néma hibát okozna, ha valaki átrendezi.
 *
 * `Record`, nem tömb: így egy új státusz addig nem fordul le, amíg nem kapott
 * helyet a sorban.
 *
 * FIGYELEM: a `USER_SELECTION`-t jelenleg SEMMI nem állítja be — a
 * `resolveStatus()` a RAW_PHOTOS_UPLOAD után egyből EDITOR_SELECTION-re lép.
 * A rá épülő feltételek tehát ma még nem tüzelnek.
 */
export const PHOTO_SHOOTING_STATUS_RANK: Record<PhotoShootingStatus, number> = {
  PHOTOGRAPHER_SELECTION: 0,
  WAITING_FOR_THE_DATE: 1,
  RAW_PHOTOS_UPLOAD: 2,
  USER_SELECTION: 3,
  EDITOR_SELECTION: 4,
  FINAL_PHOTOS_UPLOAD: 5,
  WAITING_FOR_PAYMENT: 6,
  COMPLETED: 7,
  // Bármelyik állapotból ide lehet kerülni, de visszaút nincs — ezért a végén.
  CLOSED: 8,
};

export function isStatusBefore(
  status: PhotoShootingStatus,
  reference: PhotoShootingStatus,
) {
  return (
    PHOTO_SHOOTING_STATUS_RANK[status] < PHOTO_SHOOTING_STATUS_RANK[reference]
  );
}

export function isStatusAtLeast(
  status: PhotoShootingStatus,
  reference: PhotoShootingStatus,
) {
  return (
    PHOTO_SHOOTING_STATUS_RANK[status] >= PHOTO_SHOOTING_STATUS_RANK[reference]
  );
}

/*
 * Amit az ügyfélportál mutat. Szándékosan NEM a
 * `PHOTO_SHOOTING_STATUS_LABEL`: az a belső munkafolyamat neve
 * ('Szerkesztő kiválasztása', 'Nyers képek feltöltése'), ami az ügyfélnek
 * semmit nem mond, a 'Bezárt' pedig kifejezetten riasztó. Több belső állapot
 * szándékosan ugyanarra a címkére képződik le — az ügyfél szempontjából
 * ugyanaz történik.
 *
 * Rövidek maradnak: a kártyán a dátum mellett ülnek egy sorban
 * ('Szeptember 29., kedd · 11:00'), egy hosszabb címke összenyomná a címet.
 */
export const PHOTO_SHOOTING_STATUS_CLIENT_LABEL: Record<
  PhotoShootingStatus,
  string
> = {
  PHOTOGRAPHER_SELECTION: 'Visszaigazolva',
  WAITING_FOR_THE_DATE: 'Közelgő',
  RAW_PHOTOS_UPLOAD: 'Feldolgozás alatt',
  USER_SELECTION: 'Válogatásra vár',
  EDITOR_SELECTION: 'Retusálás alatt',
  FINAL_PHOTOS_UPLOAD: 'Retusálás alatt',
  WAITING_FOR_PAYMENT: 'Fizetésre vár',
  COMPLETED: 'Elkészült',
  CLOSED: 'Lezárt',
};

/*
 * A `PHOTO_SHOOTING_STATUS_BADGE_CLASSNAME` shadcn-tokenekre épül (admin,
 * sötét mód), ami a krém hátterű portálon idegen lenne. Ezek a 2026-os
 * paletta idősáv-állapotszíneit használják, amelyek AA-t teljesítenek a saját
 * felületükön.
 *
 * Három állapot: az ügyfélre vár / dolgozunk rajta / nincs teendő.
 */
const CLIENT_BADGE_ACTION_NEEDED =
  'bg-brand-taken-surface text-brand-taken border border-brand-taken-edge';
const CLIENT_BADGE_IN_PROGRESS =
  'bg-[#e7e2d6] text-[#4b5a58] border border-[#d9d3c7]';
const CLIENT_BADGE_SETTLED =
  'bg-brand-free-surface text-brand-free border border-brand-free-edge';

export const PHOTO_SHOOTING_STATUS_CLIENT_BADGE_CLASSNAME: Record<
  PhotoShootingStatus,
  string
> = {
  USER_SELECTION: CLIENT_BADGE_ACTION_NEEDED,
  WAITING_FOR_PAYMENT: CLIENT_BADGE_ACTION_NEEDED,

  PHOTOGRAPHER_SELECTION: CLIENT_BADGE_IN_PROGRESS,
  RAW_PHOTOS_UPLOAD: CLIENT_BADGE_IN_PROGRESS,
  EDITOR_SELECTION: CLIENT_BADGE_IN_PROGRESS,
  FINAL_PHOTOS_UPLOAD: CLIENT_BADGE_IN_PROGRESS,
  CLOSED: CLIENT_BADGE_IN_PROGRESS,

  WAITING_FOR_THE_DATE: CLIENT_BADGE_SETTLED,
  COMPLETED: CLIENT_BADGE_SETTLED,
};

/*
 * Az ügyfélportál részletek-oldalán a harmonika szekciói. A `Record` miatt egy
 * új `PhotoShootingStatus` addig nem fordul le, amíg el nem döntöttük, melyik
 * szekció nyíljon hozzá — ugyanaz a védelem, mint a fenti címkéknél.
 *
 * A kérdés nem az, hogy melyik szekció „illik” a státuszhoz, hanem hogy miért
 * jött az ügyfél: ha rajta a sor (válogatás, fizetés), azt nyitjuk ki, minden
 * más esetben az áttekintést.
 */
export const CLIENT_PORTAL_SECTIONS = [
  'details',
  'image-selection',
  'invoices',
] as const;

export type ClientPortalSection = (typeof CLIENT_PORTAL_SECTIONS)[number];

export const CLIENT_PORTAL_DEFAULT_SECTION: Record<
  PhotoShootingStatus,
  ClientPortalSection
> = {
  // Az ügyfélen a sor.
  USER_SELECTION: 'image-selection',
  WAITING_FOR_PAYMENT: 'invoices',

  // Megvan minden, a számla a legérdekesebb.
  COMPLETED: 'invoices',

  // Nincs teendő, csak tájékozódik.
  PHOTOGRAPHER_SELECTION: 'details',
  WAITING_FOR_THE_DATE: 'details',
  RAW_PHOTOS_UPLOAD: 'details',
  EDITOR_SELECTION: 'details',
  FINAL_PHOTOS_UPLOAD: 'details',
  CLOSED: 'details',
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

// Ügyfélnek is megmutatjuk, ezért nem belső szakszó. A gyakorlatban ma minden
// számla SETTLED-ként jön létre (lásd a generate-deposit-invoice jobot), a
// másik kettő a jövőbeli eseteké.
export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  WAITING_FOR_PAYMENT: 'Fizetésre vár',
  SETTLED: 'Kifizetve',
  REFUNDED: 'Visszatérítve',
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

  // Client portal. The first two are public and meant to be shared; only
  // `clientPortalShootingDetails` is gated. Built here so the confirmation
  // email and the pages themselves can never drift apart.
  clientPortalHome: (clientProfileId: string) => `/client/${clientProfileId}`,
  // The bare shooting URL only redirects to the gallery — it stays because it
  // was the shareable link before `/public` existed.
  clientPortalShooting: (clientProfileId: string, shootingId: string) =>
    `/client/${clientProfileId}/shooting/${shootingId}`,
  clientPortalShootingGallery: (clientProfileId: string, shootingId: string) =>
    `/client/${clientProfileId}/shooting/${shootingId}/public`,
  clientPortalShootingDetails: (clientProfileId: string, shootingId: string) =>
    `/client/${clientProfileId}/shooting/${shootingId}/details`,
  clientPortalVerify: '/api/client-portal/verify',
  clientPortalInvalidLink: '/client/ervenytelen-link',
  terms: '/aszf',
};
