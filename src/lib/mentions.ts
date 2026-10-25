import { UUID_RE } from '@/lib/constants';

export interface MentionCandidate {
  id: string;
  /** Shown in the comment body as `@nickname`. */
  nickname: string;
  /** Full name: listed in the suggestions and shown on hover. */
  name: string;
}

export type MentionSegment = string | { id: string; label: string | null };

// TipTap's mention markdown: `[@ id="…" label="…"]`, attributes in any order
const MENTION_RE = /\[@((?:\s+\w+=(?:"[^"]*"|'[^']*'))+)\s*\]/g;
const ATTR_RE = /(\w+)=(?:"([^"]*)"|'([^']*)')/g;

/**
 * Splits stored comment text into plain text and mentions. A shortcode without
 * a valid staff id stays text, so a hand-typed one never becomes a mention.
 */
export function splitMentions(text: string): MentionSegment[] {
  const segments: MentionSegment[] = [];
  let last = 0;

  for (const match of text.matchAll(MENTION_RE)) {
    const attrs = new Map(
      Array.from(match[1].matchAll(ATTR_RE), ([, key, dq, sq]) => [
        key,
        dq ?? sq,
      ]),
    );
    const id = attrs.get('id');
    if (id == null || !UUID_RE.test(id)) continue;

    if (match.index > last) segments.push(text.slice(last, match.index));
    segments.push({ id, label: attrs.get('label') || null });
    last = match.index + match[0].length;
  }

  if (last < text.length) segments.push(text.slice(last));
  return segments;
}

// Typing `agi` should find `Ági`
function fold(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('hu-HU');
}

export function filterMentionCandidates(
  candidates: MentionCandidate[],
  query: string,
  limit = 8,
): MentionCandidate[] {
  const needle = fold(query.trim());

  return candidates
    .filter(
      ({ name, nickname }) =>
        fold(name).includes(needle) || fold(nickname).includes(needle),
    )
    .slice(0, limit);
}
