import type { Photo } from 'react-photo-album';

// --- Local images via static import ---------------------------------------
// Static imports give you { src, width, height, blurDataURL } automatically,
// which is exactly what react-photo-album (width/height for the justified
// layout) and next/image (blurDataURL for the blur placeholder) both want.
//
// IMPORTANT: these files must NOT live in /public. Files in /public are served
// as-is and can't be imported for their dimensions. Put them anywhere that
// gets processed by the bundler, e.g. a top-level /photos folder or /src/photos.
// The "@/photos/..." alias below assumes a /photos folder mapped in tsconfig
// (adjust the path to wherever you actually keep them).
import hofeherPelda1 from '@/photos/2026/decor-sets/hofeher-minta-1.jpg';
import hofeherPelda2 from '@/photos/2026/decor-sets/hofeher-minta-2.jpg';
import hofeherPelda3 from '@/photos/2026/decor-sets/hofeher-minta-3.jpg';
import hofeherPelda4 from '@/photos/2026/decor-sets/hofeher-minta-4.jpg';
import hofeherPelda5 from '@/photos/2026/decor-sets/hofeher-minta-5.jpg';
import hofeherPelda6 from '@/photos/2026/decor-sets/hofeher-minta-6.jpg';
import retro1 from '@/photos/2026/decor-sets/retro-1.jpg';
import retro2 from '@/photos/2026/decor-sets/retro-2.jpg';
import retro3 from '@/photos/2026/decor-sets/retro-3.jpg';
import retro4 from '@/photos/2026/decor-sets/retro-4.jpg';
import retro5 from '@/photos/2026/decor-sets/retro-5.jpg';
import retro6 from '@/photos/2026/decor-sets/retro-6.jpg';
import rawQ7_2 from '@/photos/2026/faq-images/raw-image-example-2.jpg';
import rawQ7_1 from '@/photos/2026/faq-images/raw-image-example.jpg';
import fenyjatekPelda from '@/photos/2026/fenyjatek/fenyjatek-pelda-1.jpg';
import fenyjatekPelda2 from '@/photos/2026/fenyjatek/fenyjatek-pelda-2.jpg';
import fenyjatekPelda3 from '@/photos/2026/fenyjatek/fenyjatek-pelda-3.jpg';
import fenyjatekPelda5 from '@/photos/2026/fenyjatek/fenyjatek-pelda-5.jpg';
import fenyjatekPelda6 from '@/photos/2026/fenyjatek/fenyjatek-pelda-6.jpg';

import type { DecorSet } from '@/generated/prisma/client';

export const decorSetGalleries: Record<DecorSet, Photo[]> = {
  HOFEHER: [
    { ...hofeherPelda1, alt: 'Hófehér példa' },
    { ...hofeherPelda2, alt: 'Hófehér példa 2' },
    { ...hofeherPelda3, alt: 'Hófehér példa 3' },
    { ...hofeherPelda4, alt: 'Hófehér példa 4' },
    { ...hofeherPelda5, alt: 'Hófehér példa 5' },
    { ...hofeherPelda6, alt: 'Hófehér példa 6' },
  ],
  RETRO: [
    { ...retro1, alt: 'retro díszlet minta' },
    { ...retro2, alt: 'retro díszlet minta 2' },
    { ...retro3, alt: 'retro díszlet minta 3' },
    { ...retro4, alt: 'retro díszlet minta 4' },
    { ...retro5, alt: 'retro díszlet minta 5' },
    { ...retro6, alt: 'retro díszlet minta 6' },
  ],
};

export const lightPlayGallery: Photo[] = [
  { ...fenyjatekPelda, alt: 'Fényjáték példa' },
  { ...fenyjatekPelda2, alt: 'fenyjatek 2' },
  { ...fenyjatekPelda3, alt: 'fenyjatek 3' },
  { ...fenyjatekPelda5, alt: 'fenyjatek 5' },
  { ...fenyjatekPelda6, alt: 'fenyjatek 6' },
];

export const faqImages = {
  question_7: [
    { ...rawQ7_1, alt: 'nyers kép 1' },
    { ...rawQ7_2, alt: 'nyers kép 2' },
  ] satisfies Photo[],
};
