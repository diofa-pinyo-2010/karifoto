// Static content. Replace with a CMS / API fetch when the backend lands.

import { Photo } from 'react-photo-album';

import { decorSetGalleries, gallery } from '@/lib/fetch-photos';
import alomkastelyDiszlet from '@/photos/alomkastely-diszlet.jpg';
import fenyjatek1 from '@/photos/fenyjatek-gallery-1.jpg';
import hofeherDiszlet from '@/photos/hofeher-diszlet.jpg';

/** A `highlighted: true` csomag badge-e. */
export const PACKAGE_HIGHLIGHT_BADGE = 'Népszerű';

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
  {
    initial: 'M',
    name: 'Mesehős',
    when: '9 hónapja · Google',
    text: 'Első családi fotózásunkat töltöttük náluk a 4 hónapos kislányunkkal. Márk fotózott minket, aki nagyon kedves, türelmes és segítőkész volt. Jövőre ugyanitt, ugyanekkor egy évvel idősebb kislánnyal térünk vissza hozzátok :)',
    href: 'https://maps.app.goo.gl/ZJzpCWSu3s34YDjV6',
  },
];

export const RATING = { score: '4,9', count: 99 };

// --- Díszletek ---------------------------------------------------------------

export type SetColor = { name: string; hex: string };

type PhotoSet = {
  id: string; // section anchor
  key: DecorSetKey | null;
  name: string;
  tagline: string;
  desc: string;
  colors?: SetColor[];
  tips: string;
  gallery: Photo[];
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
    desc: 'A már ikonikus díszletünk idén új köntösben és még varázslatosabban vár Benneteket!',
    colors: [
      { name: 'Fehér', hex: '#F4F1EC' },
      { name: 'Türkiz', hex: '#8FC7C9' },
      { name: 'Bézs', hex: '#E3D3BC' },
    ],
    tips: 'A világos árnyalatokból összeállított „Hófehér” díszletünkhöz legjobban a világos ruhák illenek: fehér, bézs és pasztell színekből összeállított kombinációk kiválóan mutatnak a képeken. Szintén nagyszerű hatást érhettek el, ha összehangoltan öltöztök, akár otthonos, akár elegáns ruhákban. A világos, mintás pizsamák különösen jól mutatnak a sötétebb, fényjátékos beállításoknál (lásd lentebb). Ne féljetek kreatívnak lenni, így lesz tökéletes az élmény!',
    gallery: gallery.HOFEHER,
  },
  {
    id: 'diszlet-alomkastely',
    key: 'alomkastely',
    name: 'Álomkastély',
    tagline: 'Arany fények, sötétzöld fal',
    desc: 'Idén egy igazán elegáns és kifinomult, a megszokottól kicsit elrugaszkodott díszlettel készülünk Nektek!',
    colors: [
      { name: 'Fekete', hex: '#161616' },
      { name: 'Antracit', hex: '#2F3130' },
      { name: 'Arany', hex: '#D4A95F' },
    ],
    tips: 'A sötét antracit és arany árnyalataiból összeállított "Álomkastély" díszletünkhöz az elegáns viseletek illenek a legjobban, mert ez a díszlet is egy elegánsabb stílust képvisel. Válasszatok ünneplős ruhákat, estélyiket, zakókat és ingeket. Ajánlott színek: fekete, fehér, arany, barna és ezek különböző árnyalatai.',
    gallery: gallery.ALOMKASTELY,
  },
  {
    id: 'diszlet-fenyjatek',
    key: null,
    name: 'Fényjáték',
    tagline: 'Meleg izzók, meghitt közelik',
    desc: 'Sötét tónusú, különleges képeink varázslatosan idézik fel a karácsony otthonos, meghitt hangulatát.',
    tips: 'A stílust 4 éve a "HÓFEHÉR" díszlet ihlette, és idén is a díszlet megújult változatában készítjük a Fényjátékos fotókat.',
    gallery: gallery.FENYJATEK,
    extra: true,
  },
];

// For Sets2
export type DecorSetSection = {
  id: string;
  setKey: DecorSetKey | null;
  name: string;
  tagline: string;
  description: string;
  colors?: SetColor[];
  tips: string;
  mainImage: Omit<Photo, 'alt'> & { alt: string };
  gallery: Photo[];
  isExtra?: boolean;
};

export const decorSetSections: DecorSetSection[] = [
  {
    id: 'diszlet-hofeher',
    setKey: 'hofeher',
    name: 'Hófehér',
    tagline: 'Világos, havas hangulat',
    description:
      'A már ikonikus díszletünk idén új köntösben és még varázslatosabban vár Benneteket!',
    colors: [
      { name: 'Tört fehér', hex: '#F4F1EC' },
      { name: 'Türkiz', hex: '#8FC7C9' },
      { name: 'Bézs', hex: '#E3D3BC' },
    ],
    tips: 'A világos árnyalatokból összeállított „Hófehér” díszletünkhöz legjobban a világos ruhák illenek: fehér, bézs és pasztell színekből összeállított kombinációk kiválóan mutatnak a képeken. Szintén nagyszerű hatást érhettek el, ha összehangoltan öltöztök, akár otthonos, akár elegáns ruhákban. A világos, mintás pizsamák különösen jól mutatnak a sötétebb, fényjátékos beállításoknál (lásd lentebb). Ne féljetek kreatívnak lenni, így lesz tökéletes az élmény!',
    mainImage: { ...hofeherDiszlet, alt: 'Hófehér díszlet' },
    gallery: decorSetGalleries.HOFEHER,
  },
  {
    id: 'diszlet-alomkastely',
    setKey: 'alomkastely',
    name: 'Álomkastély',
    tagline: 'Arany fények, sötétzöld fal',
    description:
      'Idén egy igazán elegáns és kifinomult, a megszokottól kicsit elrugaszkodott díszlettel készülünk Nektek!',
    colors: [
      { name: 'Fekete', hex: '#161616' },
      { name: 'Antracit', hex: '#2F3130' },
      { name: 'Arany', hex: '#D4A95F' },
    ],
    tips: 'A sötét antracit és arany árnyalataiból összeállított "Álomkastély" díszletünkhöz az elegáns viseletek illenek a legjobban, mert ez a díszlet is egy elegánsabb stílust képvisel. Válasszatok ünneplős ruhákat, estélyiket, zakókat és ingeket. Ajánlott színek: fekete, fehér, arany, barna és ezek különböző árnyalatai.',
    mainImage: { ...alomkastelyDiszlet, alt: 'Álomkastély díszlet' },
    gallery: decorSetGalleries.ALOMKASTELY,
  },
  {
    id: 'extra-fenyjatek',
    setKey: null,
    name: 'Fényjáték ✨',
    tagline: 'Extra ajánlat, bármelyik díszlet mellé',
    description:
      'Sötét tónusú, különleges képeink varázslatosan idézik fel a karácsony otthonos, meghitt hangulatát.',
    tips: 'A stílust 4 éve a "HÓFEHÉR" díszlet ihlette, és idén is a díszlet megújult változatában készítjük a Fényjátékos fotókat.',
    mainImage: { ...fenyjatek1, alt: 'Fényjáték' },
    gallery: gallery.FENYJATEK,
    isExtra: true,
  },
];
