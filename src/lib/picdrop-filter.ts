/**
 * A PicDrop galéria szűrt nézetei és a renderelt szűrő-szöveg értelmezése.
 *
 * Szándékosan I/O nélküli fájl: a szerverhívás (`picdrop.ts`) importálja az
 * `env`-et, ez viszont a kliens portál oldalán és a tesztekben is kell.
 */

export const PICDROP_FILTERS = {
  /** Fekete zászló: szerkesztésre kért képek. */
  final: ['filterflags', 'final'],
  /** Piros szív: extra retusra kért képek. */
  liked: ['filterliked', '1'],
} as const;

export type PicdropFilter = keyof typeof PICDROP_FILTERS;

export function buildPicdropFilterUrl(
  rawImagesUrl: string,
  filter: PicdropFilter,
) {
  const url = new URL(rawImagesUrl);
  const [key, value] = PICDROP_FILTERS[filter];
  url.searchParams.set(key, value);
  return url.toString();
}

/**
 * Csak `https://picdrop.com` (és aldomainjei) mehet tovább a scrapernek. A
 * `rawImagesUrl`-t a személyzet gépeli be, de a mi szerverünk kéri le egy
 * külső szolgáltatáson át, ezért nem engedünk tetszőleges címet.
 */
export function isPicdropUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      (url.hostname === 'picdrop.com' || url.hostname.endsWith('.picdrop.com'))
    );
  } catch {
    return false;
  }
}

/**
 * A szűrt galéria renderelt szövegéből kiolvassa, hány kép felel meg a
 * szűrőnek ("The filter is active. **2 out of 35** files are shown.").
 *
 * Ha nem találja a szöveget, 0: az üres szűrő (pl. senki nem kért retust) a
 * gyakori eset. A hálózati hibát nem ez, hanem a hívó kezeli hibaként; egy
 * tévesen 0-nak olvasott szám ellen a dialógus véd, ahol az ügyfél beküldés
 * előtt látja és javíthatja a számokat. A PicDrop angol felületi szövegére
 * illeszt; a scraper ezért `en-US` locale-lal kéri az oldalt.
 */
export function parsePicdropFilterCount(text: string): number {
  const match = /\b(\d+)\s+out\s+of\s+(\d+)\b/i.exec(text);
  return match == null ? 0 : Number(match[1]);
}
