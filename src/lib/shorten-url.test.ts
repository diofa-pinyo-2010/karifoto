import { describe, expect, it } from 'vitest';

import { isBareUrl, shortenUrl } from '@/lib/shorten-url';

const LONG =
  'https://www.example.com/galeria/2026/karacsonyi-fotozas/nemeth-csalad/valogatas?token=abcdef0123456789';

describe('shortenUrl', () => {
  it('leaves a short URL whole, minus the scheme and trailing slash', () => {
    expect(shortenUrl('https://www.karifoto.hu/')).toBe('www.karifoto.hu');
    expect(shortenUrl('http://karifoto.hu/foglalas')).toBe(
      'karifoto.hu/foglalas',
    );
  });

  it('cuts the middle of a long URL and keeps both ends', () => {
    expect(shortenUrl(LONG)).toBe('www.example.com/gal[…]n=abcdef0123456789');
  });

  it('never exceeds maxLength', () => {
    for (const maxLength of [1, 2, 3, 4, 10, 40]) {
      expect(Array.from(shortenUrl(LONG, maxLength)).length).toBe(maxLength);
    }
  });

  it('cuts plainly when the marker leaves no room for the URL', () => {
    expect(shortenUrl(LONG, 3)).toBe('www');
    expect(shortenUrl(LONG, 4)).toBe('w[…]');
  });

  it('keeps a URL of exactly maxLength unchanged', () => {
    const url = `example.com/${'a'.repeat(28)}`;
    expect(url).toHaveLength(40);
    expect(shortenUrl(`https://${url}`)).toBe(url);
  });

  it('decodes percent-escapes for display', () => {
    expect(shortenUrl('https://example.com/%C3%A1rak')).toBe(
      'example.com/árak',
    );
  });

  it('survives malformed escapes', () => {
    expect(shortenUrl('https://example.com/100%')).toBe('example.com/100%');
  });

  it('does not split a character made of two code units', () => {
    expect(shortenUrl(`https://example.com/${'🎄'.repeat(40)}`, 10)).toBe(
      'exam[…]🎄🎄🎄',
    );
  });
});

describe('isBareUrl', () => {
  it('matches text that is the URL itself, however it was written', () => {
    expect(isBareUrl(LONG, LONG)).toBe(true);
    expect(isBareUrl('www.example.com', 'http://www.example.com')).toBe(true);
    expect(isBareUrl('example.com/', 'https://example.com')).toBe(true);
  });

  it('does not match words someone chose', () => {
    expect(isBareUrl('a stúdió oldalát', 'https://karifoto.hu')).toBe(false);
    expect(isBareUrl('karifoto.hu/foglalas', 'https://karifoto.hu')).toBe(
      false,
    );
  });
});
