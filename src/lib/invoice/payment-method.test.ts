import { describe, expect, it } from 'vitest';

import { PaymentMethod } from '@/generated/prisma/enums';
import { toSzamlazzPaymentMethod } from '@/lib/invoice/payment-method';

/**
 * A szamlazz.hu a `fizmod` mezőben magyar szöveget vár, nem kódot, ezért a
 * teszt a konkrét sztringeket állítja, nem az enum tagokat: ez az, ami a
 * drótra kerül és amit a szamlazz validál.
 */
describe('toSzamlazzPaymentMethod', () => {
  it('maps CASH to készpénz', () => {
    expect(toSzamlazzPaymentMethod(PaymentMethod.CASH)).toBe('készpénz');
  });

  it('maps CARD to bankkártya', () => {
    expect(toSzamlazzPaymentMethod(PaymentMethod.CARD)).toBe('bankkártya');
  });

  it('maps TRANSFER to átutalás', () => {
    expect(toSzamlazzPaymentMethod(PaymentMethod.TRANSFER)).toBe('átutalás');
  });

  // A lookup exhaustive `Record`, tehát egy új PaymentMethod tag már fordítási
  // hibát ad. Ez a teszt arra van, hogy futásidőben se lehessen `undefined` a
  // `fizmod`: az a számlát csendben hibás dokumentummá tenné.
  it('covers every PaymentMethod member', () => {
    for (const method of Object.values(PaymentMethod)) {
      expect(toSzamlazzPaymentMethod(method)).toBeTypeOf('string');
      expect(toSzamlazzPaymentMethod(method)).not.toBe('');
    }
  });
});
