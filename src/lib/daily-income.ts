import { LedgerEntryCategory, PaymentMethod } from '@/generated/prisma/enums';

type DailyIncomeEntry = {
  category: LedgerEntryCategory;
  method: PaymentMethod;
  amountInCents: number;
};

/**
 * A Mai nap oldal kártyái: a stúdióban aznap átvett pénz.
 *
 * Csak a hátralék-befizetés (`INCOME_CLIENT_PAYMENT_BALANCE`) számít, mert az
 * az egyetlen, amit helyben veszünk át (terminál vagy készpénz). Az előleg és
 * az extra díj online, Stripe-on jön, akkor is, ha épp aznap érkezik.
 *
 * A brifkó a kasszában lévő készpénz: a mai készpénzes bevétel plusz a váltó.
 */
export function summarizeDailyIncome(
  entries: DailyIncomeEntry[],
  dailyChangeInCents: number,
) {
  const studioEntries = entries.filter(
    (entry) =>
      entry.category === LedgerEntryCategory.INCOME_CLIENT_PAYMENT_BALANCE,
  );
  const sumBy = (method?: PaymentMethod) =>
    studioEntries
      .filter((entry) => method === undefined || entry.method === method)
      .reduce((sum, entry) => sum + entry.amountInCents, 0);

  const cash = sumBy(PaymentMethod.CASH);

  return {
    total: sumBy(),
    card: sumBy(PaymentMethod.CARD),
    cash,
    cashBox: cash + dailyChangeInCents,
  };
}
