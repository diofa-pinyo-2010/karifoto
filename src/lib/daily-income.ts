import { LedgerEntryCategory, PaymentMethod } from '@/generated/prisma/enums';

const STAFF_PAYOUT_CATEGORIES = new Set<LedgerEntryCategory>([
  LedgerEntryCategory.EXPENSE_PHOTOGRAPHER_FEE,
  LedgerEntryCategory.EXPENSE_EDITOR_FEE,
  LedgerEntryCategory.EXPENSE_STAFF_BONUS,
]);

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
 * A brifkó a kasszában lévő készpénz: a mai készpénzes bevétel plusz a váltó,
 * mínusz a ma készpénzben kifizetett staff díjak és bónuszok — azok a
 * kasszából mennek.
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

  // A kiadás-sorok negatívak, itt pozitív összegként adjuk vissza.
  const staffPayoutCash = entries
    .filter(
      (entry) =>
        STAFF_PAYOUT_CATEGORIES.has(entry.category) &&
        entry.method === PaymentMethod.CASH,
    )
    .reduce((sum, entry) => sum - entry.amountInCents, 0);

  return {
    total: sumBy(),
    card: sumBy(PaymentMethod.CARD),
    cash,
    staffPayoutCash,
    cashBox: cash + dailyChangeInCents - staffPayoutCash,
  };
}
