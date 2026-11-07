import * as z from 'zod';

// Only http(s): the URL ends up in an <a href>, so `javascript:` and friends
// must never get stored.
const reviewUrlSchema = z.url({ protocol: /^https?$/ });

/** The trimmed review URL, or `null` if it is not an http(s) link. */
export function parseReviewUrl(url: string | null) {
  const parsed = reviewUrlSchema.safeParse(url?.trim() ?? '');
  return parsed.success ? parsed.data : null;
}
