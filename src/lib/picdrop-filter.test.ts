import { describe, expect, it } from 'vitest';

import {
  buildPicdropFilterUrl,
  isPicdropUrl,
  parsePicdropFilterCount,
} from '@/lib/picdrop-filter';

const SAMPLE = `Title: Demo Collaboration Mode

URL Source: https://www.picdrop.com/nemethricsi/yuLkv6588g?filterflags=final

Markdown Content:
**This gallery is set up to start in Collaboration Mode.**

The filter is active. **2 out of 35** files are shown.

## Final

copyright-leandro-crespi-0004.jpg`;

describe('parsePicdropFilterCount', () => {
  it('reads the count from the rendered filter text', () => {
    expect(parsePicdropFilterCount(SAMPLE)).toBe(2);
  });

  it('reads an explicit zero', () => {
    expect(
      parsePicdropFilterCount('The filter is active. **0 out of 35** files'),
    ).toBe(0);
  });

  it('reads missing text as zero', () => {
    expect(parsePicdropFilterCount('No files match the filter')).toBe(0);
    expect(parsePicdropFilterCount('')).toBe(0);
  });
});

describe('buildPicdropFilterUrl', () => {
  it('adds the filter query', () => {
    expect(buildPicdropFilterUrl('https://www.picdrop.com/a/b', 'final')).toBe(
      'https://www.picdrop.com/a/b?filterflags=final',
    );
    expect(buildPicdropFilterUrl('https://www.picdrop.com/a/b', 'liked')).toBe(
      'https://www.picdrop.com/a/b?filterliked=1',
    );
  });

  it('keeps an existing query and overrides the same key', () => {
    expect(
      buildPicdropFilterUrl(
        'https://www.picdrop.com/a/b?x=1&filterflags=red',
        'final',
      ),
    ).toBe('https://www.picdrop.com/a/b?x=1&filterflags=final');
  });
});

describe('isPicdropUrl', () => {
  it('accepts picdrop over https', () => {
    expect(isPicdropUrl('https://www.picdrop.com/a/b')).toBe(true);
    expect(isPicdropUrl('https://picdrop.com/a/b')).toBe(true);
  });

  it('rejects other hosts, look-alikes and http', () => {
    expect(isPicdropUrl('https://evil.com/picdrop.com')).toBe(false);
    expect(isPicdropUrl('https://notpicdrop.com/a')).toBe(false);
    expect(isPicdropUrl('http://www.picdrop.com/a')).toBe(false);
    expect(isPicdropUrl('not a url')).toBe(false);
  });
});
