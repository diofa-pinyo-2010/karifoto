// Static content. Replace with a CMS / API fetch when the backend lands.

import { Photo } from 'react-photo-album';

import { PACKAGE_PRICES } from '@/lib/constants';
import { gallery } from '@/lib/fetch-photos';
import { formatMoney } from '@/lib/utils';

export type Feature = { text: string; ok: boolean; note?: string };

export type PackageKey = 'mini' | 'classic' | 'family';

export type Package = {
  id: PackageKey;
  name: string;
  sub: string;
  price: string;
  priceHuf: number;
  studioFee: string;
  studioFeeHuf: number;
  badge?: string;
  features: Feature[];
  footnotes: string[];
};

export type Day = {
  id: string; // ISO date — use this as the API key
  weekday: string;
  label: string;
  note: string;
  slots: string[]; // empty array = fully booked
};

export const packages: Package[] = [
  {
    id: 'mini',
    name: 'Mini',
    sub: '30 perc · egy választható díszlet',
    price: `${formatMoney(PACKAGE_PRICES.MINI.base)}`,
    priceHuf: PACKAGE_PRICES.MINI.base,
    studioFee: `+${formatMoney(PACKAGE_PRICES.MINI.studio)} stúdió bérlet`,
    studioFeeHuf: PACKAGE_PRICES.MINI.studio,
    features: [
      { text: '30 perces fotózás', ok: true },
      {
        text: 'Meghitt karácsonyi fotós díszlet, kreatív kellékek, professzionális világítás',
        ok: true,
      },
      {
        text: 'Legalább 100 db felhőből letölthető fotó',
        ok: true,
        note: 'a nyers képeket is átadjuk',
      },
      { text: '10 db szerkesztett kép*', ok: true },
      { text: 'Választható díszlet', ok: true },
      { text: 'Átöltözés', ok: false },
      { text: 'Fényjátékos képek', ok: false },
    ],
    footnotes: ['* további szerkesztett képeket lehet kérni fotózás után'],
  },
  {
    id: 'classic',
    name: 'Classic',
    sub: '40 perc · két díszlet',
    price: `${formatMoney(PACKAGE_PRICES.CLASSIC.base)}`,
    priceHuf: PACKAGE_PRICES.CLASSIC.base,
    studioFee: `+${formatMoney(PACKAGE_PRICES.CLASSIC.studio)} stúdió bérlet`,
    studioFeeHuf: PACKAGE_PRICES.CLASSIC.studio,
    badge: 'Népszerű',
    features: [
      { text: '40 perces fotózás', ok: true },
      {
        text: 'Meghitt karácsonyi fotós díszlet, kreatív kellékek, professzionális világítás',
        ok: true,
      },
      {
        text: 'Legalább 150 db felhőből letölthető fotó',
        ok: true,
        note: 'a nyers képeket is átadjuk',
      },
      { text: '15 db szerkesztett kép*', ok: true },
      { text: 'Fotózás két díszlettel', ok: true },
      { text: 'Átöltözés', ok: true },
      { text: 'Fényjátékos képek', ok: false },
    ],
    footnotes: ['* további szerkesztett képeket lehet kérni fotózás után'],
  },
  {
    id: 'family',
    name: 'Family',
    sub: '50 perc · két díszlet, fényjáték',
    price: `${formatMoney(PACKAGE_PRICES.FAMILY.base)}`,
    priceHuf: PACKAGE_PRICES.FAMILY.base,
    studioFee: `+${formatMoney(PACKAGE_PRICES.FAMILY.studio)} Ft stúdió bérlet`,
    studioFeeHuf: PACKAGE_PRICES.FAMILY.studio,
    features: [
      { text: '50 perces fotózás', ok: true },
      {
        text: 'Meghitt karácsonyi fotós díszlet, kreatív kellékek, professzionális világítás',
        ok: true,
      },
      {
        text: 'Legalább 200 db felhőből letölthető fotó',
        ok: true,
        note: 'a nyers képeket is átadjuk',
      },
      { text: '20 db szerkesztett kép*', ok: true },
      { text: 'Fotózás két díszlettel', ok: true },
      { text: 'Átöltözés', ok: true },
      { text: 'Fényjátékos képek**', ok: true },
    ],
    footnotes: [
      '* további szerkesztett képeket lehet kérni fotózás után',
      '** otthonos, sötétebb stílusú képek',
    ],
  },
];

// TODO(backend): fetch availability instead of this constant.
export const days: Day[] = [
  {
    id: '2026-12-05',
    weekday: 'Szombat',
    label: 'dec. 5.',
    note: '4 hely',
    slots: ['09:00', '10:30', '13:00', '15:30'],
  },
  {
    id: '2026-12-06',
    weekday: 'Vasárnap',
    label: 'dec. 6.',
    note: '2 hely',
    slots: ['10:00', '12:00'],
  },
  {
    id: '2026-12-12',
    weekday: 'Szombat',
    label: 'dec. 12.',
    note: 'Betelt',
    slots: [],
  },
  {
    id: '2026-12-13',
    weekday: 'Vasárnap',
    label: 'dec. 13.',
    note: '3 hely',
    slots: ['09:30', '11:00', '14:00'],
  },
  {
    id: '2026-12-19',
    weekday: 'Szombat',
    label: 'dec. 19.',
    note: '5 hely',
    slots: ['09:00', '10:30', '12:00', '14:00', '16:00'],
  },
  {
    id: '2026-12-20',
    weekday: 'Vasárnap',
    label: 'dec. 20.',
    note: '1 hely',
    slots: ['15:00'],
  },
];

export const reviews = [
  {
    initial: 'B',
    name: 'Magashegyi Bettina',
    when: '8 hónapja · Google',
    text: 'Nagyszerű élmény volt a fotózás, végig nagyon jó hangulatban telt. A díszletek csodálatosak, meghitt hangulatú a hely. Mi egy páros fotózásra mentünk, ahol Maru fotózott minket. Nagyon kedvesen, támogatóan állt hozzánk, így kellemes légkörben telt az egész fotózás. Figyelt ránk, meghallgatta az ötleteinket, és segített abban, hogy igazán felszabadultan érezzük magunkat a kamera előtt. Külön pozitívum, hogy már aznap megkaptuk az összes elkészült fényképet. A fényjátékos fotók szerintem a legjobbak. Tényleg csak ajánlani tudom a stúdiót! 🎄✨',
    href: 'https://maps.app.goo.gl/Zr8Thpygf9Dm92zGA',
  },
  {
    initial: 'T',
    name: 'Bunta-Kranabeth Terézia',
    when: '7 hónapja · Google',
    text: 'Nagyon jól éreztük magunkat a fotózás során, végig kellemes és nyugodt volt a hangulat. A kisbabánk is nagyon élvezte, ami különösen sokat jelentett számunkra. A fotósunk rendkívül kedves és türelmes volt, ez igazán meglátszik a képeken is. Csak ajánlani tudjuk a Karifotó csapatát!',
    href: 'https://maps.app.goo.gl/o5AdDnsR7WEjZmt6A',
  },
  {
    initial: 'A',
    name: 'Gecser Adrienn',
    when: '9 hónapja · Google',
    text: 'Nagyon kellemesen telt a fotózás, Niki profi volt és végtelenül kedves :) Pedig nem volt egyszerű dolga a 6 hónapos kislányunkkal :D Szívből ajánlom ❤️',
    href: 'https://maps.app.goo.gl/qW2poJWjruRYk9nb8',
  },
];

export const faqs = [
  {
    q: 'Meddig lehet foglalni?',
    a: 'Amíg van szabad hely — a december 12-i nap már betelt. Jellemzően november végén elfogynak a hétvégék.',
  },
  {
    q: 'Mit vegyünk fel?',
    a: 'A foglalás után e-mailben küldünk egy rövid ruhaválasztási segédletet a stúdió színvilágához. Ha bizonytalan vagy, hozz két szettet.',
  },
  {
    q: 'Jöhet a nagymama vagy a kutya?',
    a: 'Igen, a Családi klasszikus és a Nagy ünnep csomagnál felár nélkül. A kutyát jelezd előre, hogy tudjunk időt hagyni rá.',
  },
  {
    q: 'Mi van, ha a gyerek beteg lesz?',
    a: 'A fotózás előtti napig díjmentesen áthelyezzük egy másik szabad időpontra. Előre fizetés nincs, így nem veszítesz semmit.',
  },
];

export const stats = [
  { value: "45'", label: 'Rövid fotózás — pont annyi, amíg a gyerekek bírják' },
  { value: '5 nap', label: 'Retusált képek online galériában, letöltésre' },
  { value: '3 díszlet', label: 'Kandalló, hófödött erdő és mézeskalács sarok' },
  {
    value: '0 Ft',
    label: 'Előre fizetés nincs — a foglalás ingyenes, 48h-ig mondható',
  },
];

export const RATING = { score: '4,9', count: 99 };

// --- Díszletek ---------------------------------------------------------------

export type SetColor = { name: string; hex: string };

export type PhotoSet = {
  id: string; // section anchor
  key: DecorSetKey | null;
  name: string;
  tagline: string;
  thumb: string;
  desc: string;
  colors?: SetColor[];
  tips: string;
  gallery: Photo[];
  bg: string; // section background utility
  /** true = nem alapdíszlet, hanem felárért kérhető extra */
  extra?: boolean;
};

export type DecorSetKey = 'hofeher' | 'alomkastely';

export const photoShootingSets = {
  hofeher: { name: 'Hófehér' },
  alomkastely: { name: 'Álomkastély' },
} as const satisfies Record<DecorSetKey, { name: string }>;

export const SET_ORDER: DecorSetKey[] = ['hofeher', 'alomkastely'];

export const photoSets: PhotoSet[] = [
  {
    id: 'diszlet-hofeher',
    key: 'hofeher',
    name: 'Hófehér',
    tagline: 'Világos, havas hangulat',
    thumb: '/images/diszlet-hofeher.jpg',
    desc: 'A már ikonikus díszletünk idén új köntösben és még varázslatosabban vár Benneteket!',
    colors: [
      { name: 'Fehér', hex: '#F4F1EC' },
      { name: 'Türkiz', hex: '#8FC7C9' },
      { name: 'Bézs', hex: '#E3D3BC' },
    ],
    tips: 'A világos árnyalatokból összeállított „Hófehér” díszletünkhöz legjobban a világos ruhák illenek: fehér, bézs és pasztell színekből összeállított kombinációk kiválóan mutatnak a képeken. Szintén nagyszerű hatást érhettek el, ha összehangoltan öltöztök, akár otthonos, akár elegáns ruhákban. A világos, mintás pizsamák különösen jól mutatnak a sötétebb, fényjátékos beállításoknál (lásd lentebb). Ne féljetek kreatívnak lenni, így lesz tökéletes az élmény!',
    gallery: gallery.HOFEHER,
    bg: 'bg-forest',
  },
  {
    id: 'diszlet-alomkastely',
    key: 'alomkastely',
    name: 'Álomkastély',
    tagline: 'Arany fények, sötétzöld fal',
    thumb: '/images/diszlet-alomkastely.jpg',
    desc: 'Idén egy igazán elegáns és kifinomult, a megszokottól kicsit elrugaszkodott díszlettel készülünk Nektek!',
    colors: [
      { name: 'Fekete', hex: '#161616' },
      { name: 'Antracit', hex: '#2F3130' },
      { name: 'Arany', hex: '#D4A95F' },
    ],
    tips: 'A sötét antracit és arany árnyalataiból összeállított "Álomkastély" díszletünkhöz az elegáns viseletek illenek a legjobban, mert ez a díszlet is egy elegánsabb stílust képvisel. Válasszatok ünneplős ruhákat, estélyiket, zakókat és ingeket. Ajánlott színek: fekete, fehér, arany, barna és ezek különböző árnyalatai.',
    gallery: gallery.ALOMKASTELY,
    bg: 'bg-[#122E26]',
  },
  {
    id: 'diszlet-fenyjatek',
    key: null,
    name: 'Fényjáték',
    tagline: 'Meleg izzók, meghitt közelik',
    thumb: '/images/diszlet-fenyjatek.jpg',
    desc: 'Sötét tónusú, különleges képeink varázslatosan idézik fel a karácsony otthonos, meghitt hangulatát.',
    tips: 'A stílust 4 éve a "HÓFEHÉR" díszlet ihlette, és idén is a díszlet megújult változatában készítjük a Fényjátékos fotókat.',
    gallery: gallery.FENYJATEK,
    bg: 'bg-forest',
    extra: true,
  },
];
