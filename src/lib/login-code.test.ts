import { describe, expect, it } from 'vitest';

import { stripLoginCodeSeparators } from '@/lib/login-code';

describe('stripLoginCodeSeparators', () => {
  it.each(['4821 9037', '4821-9037', ' 4821 9037\n', '48219037'])(
    'turns %j into the bare digits',
    (pasted) => {
      expect(stripLoginCodeSeparators(pasted)).toBe('48219037');
    },
  );

  it('leaves other characters for the digit check to reject', () => {
    expect(stripLoginCodeSeparators('4821a9037')).toBe('4821a9037');
  });
});
