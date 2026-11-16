-- Kézzel írt migráció. NE generáld újra.
--
-- Fotózásonként továbbra is legfeljebb egy egyenleget lezáró befizetés lehet,
-- de ez mostantól kétféle kategória: a hátralék-befizetés
-- (`INCOME_CLIENT_PAYMENT_BALANCE`) és az ajándékvásárláskor egyben kifizetett
-- teljes összeg (`INCOME_CLIENT_PAYMENT_FULL`) is lezárja az egyenleget. Lásd
-- `SETTLES_BALANCE` a `src/lib/constants.ts`-ben és az `upcoming-work.md` 8.
-- pontját. Az index így továbbra is az egyetlen adatbázis-szintű védelem a
-- dupla rögzítés ellen.
--
-- Külön migráció, mert a Postgres nem enged egy tranzakción belül használni egy
-- most hozzáadott enum-értéket: az `ALTER TYPE ... ADD VALUE` az előző
-- migrációban van, az index már ebben hivatkozhat rá.
DROP INDEX "LedgerEntry_one_balance_per_photo_shooting_key";

CREATE UNIQUE INDEX "LedgerEntry_one_balance_per_photo_shooting_key"
  ON "LedgerEntry" ("photoShootingId")
  WHERE "category" IN ('INCOME_CLIENT_PAYMENT_BALANCE', 'INCOME_CLIENT_PAYMENT_FULL');
