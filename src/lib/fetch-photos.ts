import type { Photo } from 'react-photo-album';

import alomkastelyDiszlet from '@/photos/alomkastely-diszlet.jpg';
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
import alomkastelyGallery1 from '@/photos/alomkastely-gallery-1.jpg';
import alomkastelyGallery2 from '@/photos/alomkastely-gallery-2.jpg';
import alomkastelyGallery3 from '@/photos/alomkastely-gallery-3.jpg';
import alomkastelyGallery4 from '@/photos/alomkastely-gallery-4.jpg';
import alomkastelyGallery5 from '@/photos/alomkastely-gallery-5.jpg';
import fenyjatek1 from '@/photos/fenyjatek-gallery-1.jpg';
import fenyjatek2 from '@/photos/fenyjatek-gallery-2.jpg';
import fenyjatek3 from '@/photos/fenyjatek-gallery-3.jpg';
import fenyjatek4 from '@/photos/fenyjatek-gallery-4.jpg';
import hofeherGallery1 from '@/photos/hofeher-gallery-1.jpg';
import hofeherGallery2 from '@/photos/hofeher-gallery-2.jpg';
import hofeherGallery3 from '@/photos/hofeher-gallery-3.jpg';
import hofeherGallery4 from '@/photos/hofeher-gallery-4.jpg';

import type { DecorSet } from '@/generated/prisma/client';

// The spread pulls in src/width/height/blurDataURL from the static import;
// we just add an `alt` for accessibility. Order here is the display order.
export const gallery: Record<DecorSet | 'FENYJATEK', Photo[]> = {
  HOFEHER: [
    { ...hofeherGallery1, alt: 'Sunset over the beach' },
    { ...hofeherGallery2, alt: 'Misty forest trail' },
    { ...hofeherGallery3, alt: 'Portrait in golden light' },
    { ...hofeherGallery4, alt: 'Portrait in golden light s' },
  ],
  FENYJATEK: [
    { ...fenyjatek1, alt: 'fenyjatek 1' },
    { ...fenyjatek2, alt: 'fenyjatek 2' },
    { ...fenyjatek3, alt: 'fenyjatek 3' },
    { ...fenyjatek4, alt: 'fenyjatek 4' },
  ],
  ALOMKASTELY: [
    { ...alomkastelyDiszlet, alt: 'álomkastély díszlet' },
    { ...alomkastelyGallery1, alt: 'alomkastely 1' },
    { ...alomkastelyGallery2, alt: 'alomkastely 2' },
    { ...alomkastelyGallery3, alt: 'alomkastely 3' },
    { ...alomkastelyGallery4, alt: 'alomkastely 4' },
    { ...alomkastelyGallery5, alt: 'alomkastely 5' },
  ],
};

// --- Later: switching to an API / CMS -------------------------------------
// The <PhotoGallery> component takes `photos: Photo[]` as a prop and doesn't
// care where they come from. To move to a CMS, fetch in a Server Component and
// pass the array down:
//
//   const photos = await fetchPhotosFromCMS(); // must include width + height
//   return <PhotoGallery photos={photos} />;
//
// The only requirement is that each photo carries `src`, `width`, and `height`.
// `blurDataURL` is optional — if your CMS provides one (or you generate it),
// the blur placeholder keeps working; if not, the component just skips it.
