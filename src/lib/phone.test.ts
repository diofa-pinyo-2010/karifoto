import { describe, expect, it } from 'vitest';

import { parsePhoneNumberInput } from '@/lib/phone';

describe('parsePhoneNumberInput', () => {
  it.each([
    ['+36209876543', '+36209876543'],
    ['+36 20 987 6543', '+36209876543'],
    ['06 20 987 6543', '+36209876543'],
    ['0036 20 987 6543', '+36209876543'],
    ['+36 (20) 987-6543', '+36209876543'],
    ['06/20/987-6543', '+36209876543'],
    ['  +36 20 987 6543  ', '+36209876543'],
    ['+49 151 23456789', '+4915123456789'],
  ])('accepts %s as %s', (input, expected) => {
    expect(parsePhoneNumberInput(input)).toBe(expected);
  });

  it.each([
    '+36209876543asdasd',
    'asd+36209876543',
    'tel: +36209876543',
    '+36 20 987 6543 #12',
    '123',
    '+36 20 987',
    '',
    '   ',
  ])('rejects %s', (input) => {
    expect(parsePhoneNumberInput(input)).toBeNull();
  });
});
