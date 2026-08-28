// Static content. Replace with a CMS / API fetch when the backend lands.

export type Feature = { text: string; ok: boolean; note?: string };

export type Package = {
  id: string;
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
    sub: '30 perc · választható díszlet',
    price: '39 000 Ft',
    priceHuf: 39000,
    studioFee: '+6 000 Ft stúdió bérlet',
    studioFeeHuf: 6000,
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
    price: '49 000 Ft',
    priceHuf: 49000,
    studioFee: '+9 000 Ft stúdió bérlet',
    studioFeeHuf: 9000,
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
    price: '59 000 Ft',
    priceHuf: 59000,
    studioFee: '+12 000 Ft stúdió bérlet',
    studioFeeHuf: 12000,
    badge: 'Népszerű',
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
    initial: 'K',
    name: 'Kovács Anna',
    when: '2 hete · Google',
    text: 'A kétéves lányunk öt perc alatt felengedett. Zsuzsi végig nyugodt volt, a képek pedig gyönyörűek — a nagyszülők sírtak, amikor megkapták.',
  },
  {
    initial: 'T',
    name: 'Tóth Gergő',
    when: '1 hónapja · Google',
    text: 'Pontos, gyors, korrekt. Csütörtökön fotóztunk, hétfőn már a galériában voltak a képek. Idén is jövünk, már foglaltunk is.',
  },
  {
    initial: 'S',
    name: 'Szabó Réka',
    when: '3 hete · Google',
    text: 'A díszlet valódi, nem műanyag giccs. Végre olyan karácsonyi képeink vannak, amit ki is merünk tenni a falra.',
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

export const SLOTS_LEFT_LABEL = '15 szabad időpont maradt decemberre';
export const RATING = { score: '4,9', count: 214 };

// --- Díszletek ---------------------------------------------------------------

export type SetColor = { name: string; hex: string };

export type PhotoSet = {
  id: string; // section anchor
  name: string;
  tagline: string;
  thumb: string;
  hero: string;
  heroAlt: string;
  desc: string;
  colors: SetColor[];
  tips: string;
  shots: { src: string; alt: string }[];
  bg: string; // section background utility
  /** true = nem alapdíszlet, hanem felárért kérhető extra */
  extra?: boolean;
};

const SHOTS = [
  {
    src: '/images/hofeher-pelda-1.jpg',
    alt: 'Fehérbe öltözött család a díszletben',
  },
  { src: '/images/hofeher-pelda-2.jpg', alt: 'Nagycsalád a karácsonyfa előtt' },
  { src: '/images/hofeher-pelda-3.jpg', alt: 'Család a fényfüzérek között' },
];

/** A foglaláskor választható alapdíszletek (a Fényjáték nem tartozik ide — az extra). */
export const baseSetNames = ['Hófehér', 'Álomkastély'];

/** A Fényjáték extra felára Mini és Classic csomag esetén. */
export const LIGHT_FEE = 15000;

export const huf = (n: number) =>
  String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' Ft';

export const photoSets: PhotoSet[] = [
  {
    id: 'diszlet-hofeher',
    name: 'Hófehér',
    tagline: 'Világos, havas hangulat',
    thumb: '/images/diszlet-hofeher.jpg',
    hero: '/images/hofeher-fo.jpg',
    heroAlt: 'A Hófehér díszlet kandallóval és havas fenyőkkel',
    desc: 'A már ikonikus díszletünk idén új köntösben és még varázslatosabban vár Benneteket!',
    colors: [
      { name: 'Fehér', hex: '#F4F1EC' },
      { name: 'Türkiz', hex: '#8FC7C9' },
      { name: 'Bézs', hex: '#E3D3BC' },
    ],
    tips: 'A világos árnyalatokból összeállított „Hófehér” díszletünkhöz legjobban a világos ruhák illenek: fehér, bézs és pasztell színekből összeállított kombinációk kiválóan mutatnak a képeken. Szintén nagyszerű hatást érhettek el, ha összehangoltan öltöztök, akár otthonos, akár elegáns ruhákban. A világos, mintás pizsamák különösen jól mutatnak a sötétebb, fényjátékos beállításoknál (lásd lentebb). Ne féljetek kreatívnak lenni, így lesz tökéletes az élmény!',
    shots: SHOTS,
    bg: 'bg-forest',
  },
  {
    id: 'diszlet-alomkastely',
    name: 'Álomkastély',
    tagline: 'Arany fények, sötétzöld fal',
    thumb: '/images/diszlet-alomkastely.jpg',
    hero: '/images/diszlet-alomkastely.jpg',
    heroAlt: 'Az Álomkastély díszlet arany fényekkel',
    desc: 'Placeholder: rövid leírás az Álomkastély díszletről — arany fények, mélyzöld falak, meseszerű hangulat.',
    colors: [
      { name: 'Mélyzöld', hex: '#1D4B3C' },
      { name: 'Arany', hex: '#D9AE6A' },
      { name: 'Éjkék', hex: '#26364F' },
    ],
    tips: 'Placeholder öltözködési tipp: ide jön az Álomkastély díszlethez ajánlott ruhaválasztás leírása — mély, telített színek, bársony és elegáns anyagok, összehangolt családi szettek.',
    shots: SHOTS,
    bg: 'bg-[#122E26]',
  },
  {
    id: 'diszlet-fenyjatek',
    name: 'Fényjáték',
    tagline: 'Meleg izzók, meghitt közelik',
    thumb: '/images/diszlet-fenyjatek.jpg',
    hero: '/images/diszlet-fenyjatek.jpg',
    heroAlt: 'A Fényjáték díszlet meleg izzófüzérekkel',
    desc: 'Placeholder: rövid leírás a Fényjáték díszletről — meleg izzófüzérek, meghitt, játékos közelik.',
    colors: [
      { name: 'Meleg arany', hex: '#E2B979' },
      { name: 'Krém', hex: '#EFE3CE' },
      { name: 'Grafit', hex: '#3A3A3A' },
    ],
    tips: 'Placeholder öltözködési tipp: ide jön a Fényjáték díszlethez ajánlott ruhaválasztás leírása — egyszerű, mintátlan felsők, pizsamák, semleges tónusok, hogy a fények domináljanak.',
    shots: SHOTS,
    bg: 'bg-forest',
    extra: true,
  },
];
