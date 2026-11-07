# Staff kifizetések oldal — design

Dátum: 2026-11-07 · Státusz: tervezet, jóváhagyásra vár

## Miért

A stúdió a fotósoknak és szerkesztőknek díjat, a review standok után Google-review
bónuszt fizet. Ma nincs olyan hely, ahol a superadmin egyben látná, kinek mennyi
jár és mennyit kapott már. A tipikus pillanat: **este, a nap végén** az admin
megnyitja az oldalt, látja, hogy Nikinek ma 8 fotózás után 32 000 Ft jár,
kifizeti készpénzben, rögzíti, és az egyenleg 0 lesz. Amikor Niki legközelebb
dolgozik, az új esedékes tételek felülre adódnak hozzá.

## Célok

- Staffonként **folyószámla**: esedékes tételek (jóváírás) és kifizetések
  (terhelés) időrendben, legújabb felül, futó egyenleggel.
- Felül két kártya: **Esedékes** (aktuális egyenleg) és **Összes kifizetés**
  (kategóriánkénti bontással: fotós / szerkesztői / bónusz).
- **Kifizetés rögzítése** gomb + dialog (összeg, mód, megjegyzés).
- A kifizetés **utólag tételesen visszakereshető**: melyik fotózás melyik
  díjára, melyik review tapre ment belőle mennyi.
- Staffonként a **saját review tapek** listája a folyószámla alatt; a
  `reviewUrl` itt tölthető ki, **egyszer**.

## Nem cél

- Fotózás-oldali „Staff költségek” blokk (szóba került, a felhasználó kihagyta).
- Múltbeli, rendszeren kívüli kifizetések kezelése — ilyen nincs.
- Előleg / túlfizetés: a kifizetés legfeljebb az esedékes egyenleg lehet.
- Kifizetés törlése/módosítása a felületen — hibát a felhasználó DB-ben javít.
- `reviewUrl` módosítása kitöltés után a felületen — szintén csak DB-ben.
- A MEMBER-ek saját `my-tasks` díjösszesítőjének átalakítása (lásd „Érintett
  meglévő kód”).

## Anti-célok (ettől lenne rossz, még ha működik is)

- Ha egy összevont kifizetés után nem lehet megmondani, mennyi ment fotós-,
  mennyi szerkesztői díjra és mennyi bónuszra.
- Ha egy már kifizetett bónusz alapja (`reviewUrl`, `bonusInCents`) a felületen
  utólag átírható.
- Ha egy kifizetés többet rögzíthet, mint ami esedékes.

## Jogosultság és hely

- Új oldal: `/admin/staff-payouts`, csak `SUPERADMIN`. Új bejegyzés az
  `admin-nav.ts` „Csak admin” csoportjába (pl. „Staff kifizetések”), az oldal
  `requireNavAccess`-szel véd. A szerver actionök `verifySession()` után
  szintén SUPERADMIN-t ellenőriznek.

## Esedékes tételek (jóváírások)

Három fajta. Mindegyiknek van **összege**, **esedékesség időpontja** (ez adja a
sor dátumát és a rendezést) és **hivatkozása**.

| Tétel           | Kié                        | Mikor esedékes             | Dátum                                                        | Összeg                                        | Hivatkozás |
| --------------- | -------------------------- | -------------------------- | ------------------------------------------------------------ | --------------------------------------------- | ---------- |
| Fotós díj       | `photographerId`           | balance befizetés rögzítve | az `INCOME_CLIENT_PAYMENT_BALANCE` ledger sor `createdAt`-je | `calculatePhotographerFee(pricing, shooting)` | fotózás    |
| Szerkesztői díj | `editorId`                 | `status === COMPLETED`     | `completedAt`                                                | `calculateEditorFee(pricing, shooting)`       | fotózás    |
| Review bónusz   | `ReviewTap.staffProfileId` | `reviewUrl` kitöltve       | `reviewUrlSetAt`                                             | `ReviewTap.bonusInCents` (snapshot)           | review tap |

- Lemondott (`CANCELLED`) fotózás és pricing snapshot nélküli fotózás nem ad
  tételt (mint ma a `summarizeStaffFees`-ben).
- `staffProfileId == null` tap (inaktív standról) nem ad tételt és nem
  jelenik meg.
- Egy ember lehet ugyanazon fotózás fotósa és szerkesztője is: ez két tétel,
  a kategória választja szét őket.
- Az összegek a pricing snapshotból **élőben** számolódnak (ahogy ma). Ha egy
  díj az esedékesség után megváltozik (pl. több szerkesztett kép), a
  különbözet egyszerűen esedékes marad / a tétel részben kifizetett lesz.

## Kifizetés (terhelés)

### Adatmodell

Új modell, a kifizetés fejléce:

```prisma
model StaffPayout {
  id             String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  staffProfile   StaffProfile  @relation(fields: [staffProfileId], references: [id])
  staffProfileId String        @db.Uuid
  amountInCents  Int           // pozitív, a kifizetett teljes összeg
  method         PaymentMethod // CASH | TRANSFER a dialogban
  note           String?
  ledgerEntries  LedgerEntry[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @default(now()) @updatedAt
  @@index([staffProfileId, createdAt])
}
```

`LedgerEntry` új mezői: `staffPayoutId` (→ `StaffPayout`, opcionális) és
`reviewTapId` (→ `ReviewTap`, opcionális). Új kategória:
**`EXPENSE_STAFF_BONUS`** (előjel `-1`, címke pl. „Staff bónusz”) — a
`LEDGER_ENTRY_CATEGORY_SIGN` / `LEDGER_ENTRY_CATEGORY_LABEL` `Record` típusa
miatt ezeket kötelező kiegészíteni.

`ReviewTap` új mezője: `reviewUrlSetAt DateTime? @db.Timestamptz`.

### Rögzítés és szétosztás

A kifizetés rögzítésekor a szerver:

1. betölti a staff összes tételét és a már kifizetett ledger sorokat,
2. tételenként kiszámolja a még ki nem fizetett részt
   (`fee − már kifizetett` az adott kategória + fotózás / tap kulcsra),
3. a beírt összeget **a legrégebbi esedékes tételtől kezdve** (FIFO,
   esedékesség időpontja szerint) szétosztja,
4. egy tranzakcióban létrehozza a `StaffPayout`-ot és tételenként egy
   `LedgerEntry`-t:
   - `EXPENSE_PHOTOGRAPHER_FEE` + `photoShootingId`,
   - `EXPENSE_EDITOR_FEE` + `photoShootingId`,
   - `EXPENSE_STAFF_BONUS` + `reviewTapId`,
     mind `staffProfileId`-vel, `staffPayoutId`-vel, a fejléc `method`-jával,
     negatív előjellel.

Részkifizetésnél az utolsó érintett tétel részben kifizetett marad, a maradéka
esedékes. Ha az összeg > esedékes egyenleg, vagy ≤ 0: `{ error: '…' }`.

A szétosztás döntése **tiszta függvény** (bemenet: tételek + eddigi ledger
sorok + összeg → kimenet: ledger sor tervek vagy hiba), Vitest-tel tesztelve —
a repó mintája szerint (`checkout-metadata.ts`, `balance-payment-guard.ts`).

A tranzakción belül a döntést újra kell számolni (dupla kattintás). Hogy
ehhez elég-e az újraszámolás, vagy zárolni kell (pl. `SELECT … FOR UPDATE` a
`StaffProfile` sorra), a builder dönti el — `balance-payment.ts` jó példa a
mostani megközelítésre.

### Miért így (és nem egy ledger sor kifizetésenként)

Egy összevont ledger sorból nem derülne ki utólag, mennyi ment fotós-,
szerkesztői díjra és bónuszra, sem az, hogy egy adott fotózás díját
kifizették-e. A tételes sorokkal a kategóriák a stats oldalon is helyesen
jönnek ki, és a meglévő per-fotózás párosítás (`summarizeStaffFees`) is működik
tovább. A `StaffPayout` fejléc tartja össze, hogy ez egy darab kifizetés volt.

## Review URL kitöltése

- Szerver action: `reviewUrl`-t csak akkor ír, ha a tapnek még **nincs**
  (`updateMany where reviewUrl: null` vagy ezzel egyenértékű feltételes
  írás — a felület tiltása nem elég). Ugyanabban az írásban:
  `bonusInCents = GOOGLE_REVIEW_BONUS_IN_CENTS` (új konstans, `2000_00`) és
  `reviewUrlSetAt = now()`.
- `reviewUrl` `@unique`: ugyanaz az URL két taphez nem írható be, ezt
  emberi hibaüzenettel kell jelezni.
- Az URL formátumát legalább `z.url()`-lel ellenőrizni (a pontos Google-domain
  szűrés a builder döntése).
- UI: üres tapnél szerkeszthető mező (a meglévő `EditableTextField` /
  `EditableField` mintájára; kell egy „csak üresen szerkeszthető” mód, vagy
  egy külön kis komponens — a builder dönti el). Kitöltött tapnél
  **readonly, kattintható link** (új lapon nyílik) + a kitöltés ideje.

## UI

Jóváhagyott vázlat: „A” elrendezés, v3.

- **Fülek staffonként**, a fülön a név + esedékes egyenleg. Fület kap mindenki,
  akinek van tétele vagy kifizetése (a builder kiegészítheti az
  `isPhotographer`/`isEditor` staffal). A kiválasztott staff a URL-ben
  (`?staff=<id>`) — a repó nem tart kliens oldali globális állapotot.
- **Fejléc:** név + „Kifizetés rögzítése” gomb.
- **Kártyák:** Esedékes · Összes kifizetés (alatta bontás: fotós / szerk. /
  bónusz).
- **Folyószámla tábla:** Dátum · Tétel (badge) · Kapcsolódik (ügyfél neve +
  fotózás ideje, vagy „Tap <dátum> · <stand label>”) · Összeg (+/−) · Egyenleg
  (futó). A kifizetés egy kiemelt sor („Kifizetés · Cash”, „N tétel”),
  **lenyitható** a tételes bontásra. A jóváírásokon „kifizetve” jelölés, ha
  teljesen fedezve vannak (részben fedezettnél a builder választ jelölést).
- **Review tapek** (a folyószámla alatt, csak a staff sajátjai): Tap ideje ·
  Stand · Review URL (mező vagy link + kitöltés ideje) · Bónusz (összeg +
  esedékes / kifizetve).
- **Kifizetés dialog:** Összeg (előtöltve az esedékes egyenleggel) · Mód (Cash
  / Utalás) · Megjegyzés (opcionális) · Rögzítés.
- Admin UI → shadcn komponensek, magyar szövegek, `formatMoney()`, dátumok a
  `formatters.ts`-ből.

## Negatív egyenleg, időszak

- Az összegek élőben számolódnak, ezért egy díj a kifizetés után csökkenhet
  (kevesebb kép, árkorrekció, kifizetés utáni lemondás — `CANCELLED`-nél a
  tétel eltűnik, a ledger sorai maradnak). **Döntés (Claude):** az egyenleg
  = összes tétel − összes kifizetés, és **mehet mínuszba**; a következő
  esedékes tételek nullázzák ki. A kifizetés dialog felső határa
  `max(0, egyenleg)`. A FIFO szétosztás csak a még ki nem fizetett
  (pozitív maradékú) tételekre oszt.
- **Döntés (Claude):** a lista és a kártyák **teljes időszakot** mutatnak,
  szezonszűrő nincs; lapozás csak ha szükséges.
- Múltbeli kifizetés nincs (a felhasználó megerősítette): nem kell kezdő
  dátum, nyitó egyenleg vagy backfill. Minden eddigi nem lemondott, pricinggal
  bíró fotózás díja esedékesként jelenik meg az első napon — ez helyes.

## Mai nap oldal: készpénzes kifizetés a kasszából

A készpénzes staff kifizetés általában a Mai nap kasszájából (brifkó) megy, ezért
a Mai nap oldalnak le kell vonnia.

- `summarizeDailyIncome` (`src/lib/daily-income.ts`) kap egy új értéket: a mai
  **készpénzes staff kifizetések** összege (a mai `EXPENSE_PHOTOGRAPHER_FEE` /
  `EXPENSE_EDITOR_FEE` / `EXPENSE_STAFF_BONUS` sorok `method === CASH`-sel,
  abszolút értékben), és a `cashBox` = készpénzes bevétel + váltó −
  készpénzes staff kifizetés. A `fetchTodayLedgerEntries` már minden mai sort
  visszaad, a lekérdezést nem kell bővíteni. A meglévő tesztek mellé új esetek.
- **Döntés (Claude):** a „Készpénzes bevétel” kártya leírásában a Váltó alatt
  új sor: „Staff kifizetés: −X Ft”, alatta a Brifkó (ez az egyenleg). Külön
  kártya nem kell; ha a builder szerint olvashatatlan, mehet negyedik
  kártyára. A „Mai bevétel” és „Készpénzes bevétel” összegei nem változnak.
- A Mai nap oldalt MEMBER is látja: csak az összeg jelenik meg, név nélkül.

## Érintett meglévő kód

- `src/lib/staff-fees.ts`: a fotós díj `isDue` ma státuszalapú (`RAW_PHOTOS_UPLOAD`
  vagy későbbi). Mivel a balance rögzítése azonnal újraszámolja a státuszt, ez
  gyakorlatilag ugyanaz, mint „balance rögzítve”. Kivétel: 0 Ft-os hátralékú
  fotózás (nincs balance ledger sor, a státusz a dátum után továbblép). **A
  builder hívása:** ilyenkor a fotós díj a fotózás időpontjában
  (`timeSlot.startTime`) esedékes. Az esedékesség-logika lehetőleg egy helyen
  legyen, amit a `my-tasks` és az új oldal is használ.
- `LEDGER_ENTRY_CATEGORY_SIGN` / `_LABEL`: új kategória.
- `admin-stats.ts`: előjel alapján összegez, az új kategória automatikusan
  kiadásként jelenik meg — ellenőrizni.
- Migráció: `pnpm db:migrate` (nincs kézi SQL igény, hacsak a builder nem tesz
  be egy CHECK-et, pl. hogy bónusz kategóriánál `reviewTapId` kötelező).

## A builderre hagyva

- Lekérdezések/szerkezet (`queries.ts` vs. új fájl), komponens-bontás.
- Konkurens rögzítés elleni védelem módja.
- Részben kifizetett tétel jelölése, üres állapotok szövegei.
- Nav ikon és pontos címke.
