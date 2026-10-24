const ELLIPSIS = '[…]';

// Display only: the scheme and a trailing slash carry no information, and
// decoding turns `%C3%A1` back into the `á` someone actually typed. `www.` stays:
// on some sites it is a different host, and readers expect to see it
function stripUrl(url: string) {
  let stripped = url
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '');
  try {
    stripped = decodeURI(stripped);
  } catch {
    // Malformed escapes stay as they are
  }
  return stripped;
}

/**
 * Whether a link's text is just its own URL (a pasted bare link, or the link
 * popup with an empty text field), as opposed to words someone chose.
 */
export function isBareUrl(text: string, href: string) {
  return stripUrl(text) === stripUrl(href);
}

/**
 * Cuts the middle out of a long URL, keeping both ends: the start says which
 * site, and the end is often what tells two links apart (an id, a file name).
 */
export function shortenUrl(url: string, maxLength = 40) {
  // Code points, so an emoji or accented letter is never split in half
  const chars = Array.from(stripUrl(url));
  if (chars.length <= maxLength) return chars.join('');

  const keep = maxLength - Array.from(ELLIPSIS).length;
  // No room for the marker and a character: a plain cut beats a lone `[`
  if (keep <= 0) return chars.slice(0, maxLength).join('');

  const tailLength = Math.floor(keep / 2);
  const head = chars.slice(0, keep - tailLength).join('');
  const tail = tailLength > 0 ? chars.slice(-tailLength).join('') : '';
  return `${head}${ELLIPSIS}${tail}`;
}
