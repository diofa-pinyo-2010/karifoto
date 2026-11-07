import { describe, expect, it } from 'vitest';

import { parseReviewUrl } from '@/lib/review-url';

describe('parseReviewUrl', () => {
  it('accepts an https link, trimmed', () => {
    expect(parseReviewUrl('  https://maps.app.goo.gl/abc  ')).toBe(
      'https://maps.app.goo.gl/abc',
    );
  });

  it('rejects links that are not http(s)', () => {
    for (const url of [
      'javascript:alert(1)',
      'ftp://example.com/x',
      'mailto:a@b.hu',
    ]) {
      expect(parseReviewUrl(url)).toBeNull();
    }
  });

  it('rejects empty input and plain text', () => {
    expect(parseReviewUrl(null)).toBeNull();
    expect(parseReviewUrl('   ')).toBeNull();
    expect(parseReviewUrl('nem link')).toBeNull();
  });
});
