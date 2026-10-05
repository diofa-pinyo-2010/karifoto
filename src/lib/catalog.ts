import type { Package } from '@/generated/prisma/enums';

type AddOn = 'LIGHT_PLAY';

type AddOnDefinition = {
  label: string;
  feeInCents: number;
};

const ADD_ONS = {
  LIGHT_PLAY: { label: 'Fényjáték', feeInCents: 10000_00 },
} as const satisfies Record<AddOn, AddOnDefinition>;

type Feature = { text: string; included: boolean; note?: string };

type PackageDefinition = {
  slug: string;
  label: string;
  basePriceInCents: number;
  studioPriceInCents: number;
  editedImagesAllowance: number;
  downloadableImages: number;
  durationMinutes: number;
  decorSetsIncluded: number;
  outfitChange: boolean;
  includedAddOns: readonly AddOn[];
  visibility: 'pricingTable' | 'hidden';
  highlighted: boolean;
  maxGuests: number;
  personsIncluded: number;
};

export const PACKAGES = {
  MINI: {
    slug: 'mini',
    label: 'Mini',
    basePriceInCents: 39000_00,
    studioPriceInCents: 6000_00,
    editedImagesAllowance: 10,
    downloadableImages: 100,
    durationMinutes: 30,
    decorSetsIncluded: 1,
    outfitChange: false,
    includedAddOns: [],
    visibility: 'pricingTable',
    highlighted: false,
    maxGuests: 8,
    personsIncluded: 5,
  },
  CLASSIC: {
    slug: 'classic',
    label: 'Classic',
    basePriceInCents: 49000_00,
    studioPriceInCents: 9000_00,
    editedImagesAllowance: 15,
    downloadableImages: 150,
    durationMinutes: 40,
    decorSetsIncluded: 2,
    outfitChange: true,
    includedAddOns: [],
    visibility: 'pricingTable',
    highlighted: true,
    maxGuests: 8,
    personsIncluded: 5,
  },
  FAMILY: {
    slug: 'family',
    label: 'Family',
    basePriceInCents: 59000_00,
    studioPriceInCents: 12000_00,
    editedImagesAllowance: 20,
    downloadableImages: 200,
    durationMinutes: 50,
    decorSetsIncluded: 2,
    outfitChange: true,
    includedAddOns: ['LIGHT_PLAY'],
    visibility: 'pricingTable',
    highlighted: false,
    maxGuests: 8,
    personsIncluded: 5,
  },
} as const satisfies Record<Package, PackageDefinition>;

const NUMBER_WORDS: Record<number, string> = { 1: 'egy', 2: 'két', 3: 'három' };

const numberWord = (n: number) => NUMBER_WORDS[n] ?? String(n);

/** Pl. `50 perc · két díszlet, fényjáték` — a csomag adataiból, nem kézzel írva. */
export function buildSub({
  durationMinutes,
  decorSetsIncluded,
  includedAddOns,
}: PackageDefinition) {
  const includes = [
    decorSetsIncluded === 1
      ? 'egy választható díszlet'
      : `${numberWord(decorSetsIncluded)} díszlet`,
    ...includedAddOns.map((addOn) => ADD_ONS[addOn].label.toLowerCase()),
  ];

  return `${durationMinutes} perc · ${includes.join(', ')}`;
}

const COMMON_FEATURE =
  'Meghitt karácsonyi fotós díszlet, kreatív kellékek, professzionális világítás';

const EDITED_IMAGES_FOOTNOTE =
  '* további szerkesztett képeket lehet kérni fotózás után';
const LIGHT_PLAY_FOOTNOTE = '** otthonos, sötétebb stílusú képek';

export function buildFeatures({
  durationMinutes,
  downloadableImages,
  editedImagesAllowance,
  decorSetsIncluded,
  outfitChange,
  includedAddOns,
}: PackageDefinition) {
  const hasLightPlay = includedAddOns.includes('LIGHT_PLAY');

  const features: Feature[] = [
    { text: `${durationMinutes} perces fotózás`, included: true },
    { text: COMMON_FEATURE, included: true },
    {
      text: `Legalább ${downloadableImages} db felhőből letölthető fotó`,
      included: true,
      note: 'a nyers képeket is átadjuk',
    },
    { text: `${editedImagesAllowance} db szerkesztett kép*`, included: true },
    {
      text:
        decorSetsIncluded === 1
          ? 'Választható díszlet'
          : `Fotózás ${numberWord(decorSetsIncluded)} díszlettel`,
      included: true,
    },
    { text: 'Átöltözés', included: outfitChange },
    {
      text: hasLightPlay ? 'Fényjátékos képek**' : 'Fényjátékos képek',
      included: hasLightPlay,
    },
  ];

  const footnotes = [
    EDITED_IMAGES_FOOTNOTE,
    ...(hasLightPlay ? [LIGHT_PLAY_FOOTNOTE] : []),
  ];

  return { features, footnotes };
}

// type DecorSetDefinition = {
//   slug: string;
//   label: string;
//   tagline: string;
// };

// const DECOR_SETS = {
//   HOFEHER: {
//     slug: 'hofeher',
//     label: 'Hófehér',
//     tagline: 'Világos, havas hangulat',
//   },
//   ALOMKASTELY: {
//     slug: 'alomkastely',
//     label: 'Álomkastély',
//     tagline: 'Arany fények, sötétzöld fal',
//   },
// } as const satisfies Record<DecorSet, DecorSetDefinition>;
