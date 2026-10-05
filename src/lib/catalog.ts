import type { DecorSet, Package } from '@/generated/prisma/enums';

export type AddOn = 'LIGHT_PLAY';

type AddOnDefinition = {
  label: string;
  feeInCents: number;
  tagline: string;
  description: string;
  tips: string;
};

export const ADD_ONS = {
  LIGHT_PLAY: {
    label: 'Fényjáték',
    feeInCents: 10000_00,
    tagline: 'Extra ajánlat, bármelyik díszlet mellé',
    description:
      'Sötét tónusú, különleges képeink varázslatosan idézik fel a karácsony otthonos, meghitt hangulatát.',
    tips: 'A stílust 4 éve a "HÓFEHÉR" díszlet ihlette, és idén is a díszlet megújult változatában készítjük a Fényjátékos fotókat.',
  },
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

export function packageIncludesAddOn(pkg: Package, addOn: AddOn) {
  const addOns: readonly AddOn[] = PACKAGES[pkg].includedAddOns;
  return addOns.includes(addOn);
}

function withKeys<K extends string, V extends object>(
  definitions: Record<K, V>,
) {
  return (Object.keys(definitions) as K[]).map((key) => ({
    key,
    ...definitions[key],
  }));
}

export const ALL_PACKAGES = withKeys(PACKAGES);
export const PRICING_TABLE_PACKAGES = ALL_PACKAGES.filter(
  (pkg) => pkg.visibility === 'pricingTable',
);

export const packageSlug = (pkg: Package) => {
  return PACKAGES[pkg].slug;
};
export const packageFromSlug = (slug: string | undefined): Package | null => {
  return ALL_PACKAGES.find((pkg) => pkg.slug === slug)?.key ?? null;
};
export const requiresDecorChoice = (pkg: Package) => {
  return PACKAGES[pkg].decorSetsIncluded === 1;
};

type DecorSetDefinition = {
  slug: string;
  label: string;
  tagline: string;
  description: string;
  colors: { name: string; hex: string }[];
  tips: string;
};

export const DECOR_SETS = {
  HOFEHER: {
    slug: 'hofeher',
    label: 'Hófehér',
    tagline: 'Világos, havas hangulat',
    description:
      'A már ikonikus díszletünk idén új köntösben és még varázslatosabban vár Benneteket!',
    colors: [
      { name: 'Tört fehér', hex: '#F4F1EC' },
      { name: 'Türkiz', hex: '#8FC7C9' },
      { name: 'Bézs', hex: '#E3D3BC' },
    ],
    tips: 'A világos árnyalatokból összeállított „Hófehér” díszletünkhöz legjobban a világos ruhák illenek: fehér, bézs és pasztell színekből összeállított kombinációk kiválóan mutatnak a képeken. Szintén nagyszerű hatást érhettek el, ha összehangoltan öltöztök, akár otthonos, akár elegáns ruhákban. A világos, mintás pizsamák különösen jól mutatnak a sötétebb, fényjátékos beállításoknál (lásd lentebb). Ne féljetek kreatívnak lenni, így lesz tökéletes az élmény!',
  },
  RETRO: {
    slug: 'retro',
    label: 'Retro',
    tagline: 'Családias, nosztalgikus hangulat',
    description:
      'Olyan karácsony, amilyenre a nagyszülők nappalijából emlékszünk: meleg lámpafény, kockás pléd, fa hintaló és régi képeslapok a falon. Gyertek, és legyetek ti is egy kicsit újra gyerekek!',
    colors: [
      { name: 'Piros', hex: '#B3262E' },
      { name: 'Sötétzöld', hex: '#1F3D2E' },
      { name: 'Krém', hex: '#EBDDC4' },
    ],
    tips: 'A piros, zöld és krém árnyalataiból összeállított „Retro” díszletünkhöz a kockás, kötött és vintage hatású ruhák illenek a legjobban: bordó és zöld pulóverek, kockás ingek és szoknyák, mintás pizsamák, kötött sapkák és sálak. A krémszínű, természetes anyagok is nagyon szépen mutatnak a meleg fények között. Ha összehangolt színekben öltöztök, a kép még harmonikusabb lesz; nagy feliratokat és feltűnő logókat érdemes kerülni, így a képek időtlenek maradnak.',
  },
} as const satisfies Record<DecorSet, DecorSetDefinition>;

export const ALL_DECOR_SETS = withKeys(DECOR_SETS);

export const decorSetSlug = (set: DecorSet) => {
  return DECOR_SETS[set].slug;
};

export const decorSetFromSlug = (slug: string | undefined): DecorSet | null => {
  return ALL_DECOR_SETS.find((set) => set.slug === slug)?.key ?? null;
};
