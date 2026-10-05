// Static content. Replace with a CMS / API fetch when the backend lands.

import { Photo } from 'react-photo-album';

import { DecorSet } from '@/generated/prisma/enums';
import { ADD_ONS, ALL_DECOR_SETS } from '@/lib/catalog';
import { decorSetGalleries, lightPlayGallery } from '@/lib/fetch-photos';
import hofeherDiszlet from '@/photos/2026/decor-sets/hofeher-diszlet.png';
import retroDiszlet from '@/photos/2026/decor-sets/retro-diszlet.jpg';
import fenyjatekMain from '@/photos/2026/fenyjatek/fenyjatek-pelda-4.jpg';

import type { AddOn } from '@/lib/catalog';

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

const DECOR_SET_IMAGES: Record<
  DecorSet,
  { mainImage: Omit<Photo, 'alt'> & { alt: string }; gallery: Photo[] }
> = {
  HOFEHER: {
    mainImage: { ...hofeherDiszlet, alt: 'Hófehér díszlet' },
    gallery: decorSetGalleries.HOFEHER,
  },
  RETRO: {
    mainImage: { ...retroDiszlet, alt: 'Retro díszlet' },
    gallery: decorSetGalleries.RETRO,
  },
};

export const decorSetSections = ALL_DECOR_SETS.map((set) => ({
  ...set,
  anchor: `diszlet-${set.slug}`,
  ...DECOR_SET_IMAGES[set.key],
}));

const ADD_ON_IMAGES: Record<
  AddOn,
  { mainImage: Omit<Photo, 'alt'> & { alt: string }; gallery: Photo[] }
> = {
  LIGHT_PLAY: {
    mainImage: { ...fenyjatekMain, alt: 'Fényjátékos fotó' },
    gallery: lightPlayGallery,
  },
};

export const lightPlaySection = {
  anchor: 'extra-fenyjatek',
  ...ADD_ONS.LIGHT_PLAY,
  label: `${ADD_ONS.LIGHT_PLAY.label} ✨`,
  ...ADD_ON_IMAGES.LIGHT_PLAY,
};
