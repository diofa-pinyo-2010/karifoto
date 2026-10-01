import 'server-only';
import { env } from '@/env';
import {
  buildPicdropFilterUrl,
  isPicdropUrl,
  parsePicdropFilterCount,
} from '@/lib/picdrop-filter';

import type { PicdropFilter } from '@/lib/picdrop-filter';

const JINA_READER_URL = 'https://r.jina.ai/';
const TIMEOUT_SECONDS = 25;

/**
 * A PicDrop galéria egy JS-alkalmazás: a sima HTML-ben nincsenek benne a
 * zászlók és a szívek, és a "2 out of 35" szöveg is csak renderelés után
 * jelenik meg. Ezért a Jina Reader headless böngészőjével kérjük le.
 *
 * `null`, ha a lekérés nem sikerül (hálózat, timeout, nem 2xx válasz).
 */
async function countPicdropFilter(
  rawImagesUrl: string,
  filter: PicdropFilter,
): Promise<number | null> {
  const target = buildPicdropFilterUrl(rawImagesUrl, filter);

  try {
    const response = await fetch(`${JINA_READER_URL}${target}`, {
      headers: {
        ...(env.JINA_API_KEY != null && {
          Authorization: `Bearer ${env.JINA_API_KEY}`,
        }),
        // A zászlók élő állapota kell, nem egy korábbi lekérés gyorsítótára.
        'X-No-Cache': 'true',
        'X-Respond-With': 'markdown',
        'X-Retain-Images': 'none',
        'X-Locale': 'en-US',
        'X-Timeout': String(TIMEOUT_SECONDS),
      },
      signal: AbortSignal.timeout((TIMEOUT_SECONDS + 5) * 1000),
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[picdrop] reader request failed', {
        filter,
        status: response.status,
      });
      return null;
    }

    return parsePicdropFilterCount(await response.text());
  } catch (error) {
    console.error('[picdrop] reader request threw', { error, filter });
    return null;
  }
}

/** Fekete zászlós és piros szíves képek száma, vagy `null`, ha nem sikerült. */
export async function countPicdropSelection(
  rawImagesUrl: string,
): Promise<{ editedImages: number; retouchedImages: number } | null> {
  if (!isPicdropUrl(rawImagesUrl)) {
    console.error('[picdrop] refusing non-picdrop url', { rawImagesUrl });
    return null;
  }

  const [editedImages, retouchedImages] = await Promise.all([
    countPicdropFilter(rawImagesUrl, 'final'),
    countPicdropFilter(rawImagesUrl, 'liked'),
  ]);

  if (editedImages == null || retouchedImages == null) return null;
  return { editedImages, retouchedImages };
}
