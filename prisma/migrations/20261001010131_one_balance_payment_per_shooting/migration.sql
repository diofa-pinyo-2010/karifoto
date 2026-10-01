-- Kézzel írt migráció. NE generáld újra.
--
-- Fotózásonként legfeljebb egy egyenleg-befizetés lehet. A készpénzes tételnek
-- nincs `paymentIntent`-je, tehát a Stripe-os utat védő unique index itt nem
-- segít: ez az index az egyetlen adatbázis-szintű védelem a dupla rögzítés
-- ellen. A `resolveCashBalancePayment()` ugyanezt kérdezi meg előbb, de az
-- alkalmazásszintű ellenőrzés két párhuzamos kérésnél átengedné egymást.
--
-- Ugyanaz a minta, mint a `StaffProfile.isDefaultEditor`-nál: a Prisma séma nem
-- tud részleges unique indexet leírni, ezért csak kommentben szerepel ott.
--
-- A `resolveStatus` egyenleg-kapuja amúgy is így viselkedik: az első
-- INCOME_CLIENT_PAYMENT_BALANCE tétel zárja le az egyenleget, tehát a részleges
-- egyenleg-fizetést a státuszgép sem támogatja.
CREATE UNIQUE INDEX "LedgerEntry_one_balance_per_photo_shooting_key"
  ON "LedgerEntry" ("photoShootingId")
  WHERE "category" = 'INCOME_CLIENT_PAYMENT_BALANCE';
