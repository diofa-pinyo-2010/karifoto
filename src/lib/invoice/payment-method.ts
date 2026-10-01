import { PaymentMethod as SzamlazzPaymentMethod } from '@halftome/szamlazz-client';

import type { PaymentMethod } from '@/generated/prisma/enums';

/**
 * A saját fizetési módunkat a szamlazz `fizmod` értékére fordítja.
 *
 * Külön fájlban lakik, nem a `szamlazz-client.ts`-ben, ugyanabból az okból,
 * amiért a `line-items.ts` is: az a modul import időben `SZClient`-et épít az
 * `env.SZAMLAZZ_API_KEY`-ből, ami egy lookup táblázatról szóló tesztbe
 * behúzná az egész környezetet. Innen csak a szamlazz enum értékei jönnek.
 *
 * Exhaustive `Record`, tehát egy új `PaymentMethod` tag fordítási hibát ad —
 * nem pedig egy `undefined` `fizmod`-ot a számlán.
 */
const SZAMLAZZ_PAYMENT_METHOD: Record<PaymentMethod, SzamlazzPaymentMethod> = {
  CARD: SzamlazzPaymentMethod.Card,
  TRANSFER: SzamlazzPaymentMethod.Transfer,
  CASH: SzamlazzPaymentMethod.Cash,
};

export function toSzamlazzPaymentMethod(
  method: PaymentMethod,
): SzamlazzPaymentMethod {
  return SZAMLAZZ_PAYMENT_METHOD[method];
}
