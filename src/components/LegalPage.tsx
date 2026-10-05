import Image from 'next/image';
import Link from 'next/link';

import { Footer } from '@/components/Footer';

export const legalTitles = {
  impresszum: 'Impresszum',
  adatkezeles: 'Adatkezelési tájékoztató',
  aszf: 'Általános szerződési feltételek',
} as const;

export type LegalSlug = keyof typeof legalTitles;

/**
 * A három jogi dokumentum közös kerete. A tartalom **egyeztetési tervezet**:
 * több ponton kitöltetlen, és a cégadatok megerősítésre várnak — ezt a lap
 * tetején külön figyelmeztetés mondja ki.
 *
 * A `noindex` a route-ok `metadata` mezőjéből jön (szerveroldalon), nem
 * kliensoldali `useEffect`-ből: utóbbi csak hidratálás után tenné ki a meta
 * taget, addig a JS-t nem futtató crawlerek simán indexelnék.
 *
 * A szövegtörzs elemszinten van stílusozva (`[&_h2]`, `[&_p]`): ez folyószöveg,
 * nem komponens — minden bekezdésre osztályt aggatni itt csak zaj lenne.
 */
export function LegalPage({ slug }: { slug: LegalSlug }) {
  return (
    <div className="bg-brand-cream font-brand-sans text-brand-ink">
      <header className="bg-[#102a31] py-[18px] text-brand-cream">
        <div className="brand-shell flex items-center justify-between gap-5">
          <Link href="/" aria-label="Karifoto – kezdőlap">
            <Image
              src="/images/karifoto-logo-krem.png"
              alt="Karifoto"
              width={353}
              height={146}
              priority
              className="h-7 w-auto lg:h-9"
            />
          </Link>
          <Link href="/" className="py-3 text-xs">
            ← Vissza a főoldalra
          </Link>
        </div>
      </header>

      <main
        id="tartalom"
        className="mx-auto max-w-[850px] px-6 pt-14 pb-22 [overflow-wrap:anywhere] [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-9 [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-[28px] [&_p]:my-3 [&_p]:text-[15px] [&_p]:leading-[1.85]"
      >
        <p className="brand-eyebrow">Karifoto · Tudnivalók</p>
        <h1 className="mt-3 mb-7 font-display text-[clamp(38px,6vw,68px)] leading-[1.07] font-medium">
          {legalTitles[slug]}
        </h1>

        <aside className="rounded-2xl border border-[#c6a77c] bg-[#ece3d3] p-5 [&_p]:mb-0">
          <strong>Egyeztetési tervezet · 2026. szeptember 28.</strong>
          <p>
            Ez a dokumentum még nem hatályos. A jelölt adatok és feltételek
            véglegesítésre várnak; jelen formájában nem használható foglalási
            vagy adatkezelési feltételként.
          </p>
        </aside>

        <nav
          aria-label="Jogi dokumentumok"
          className="flex flex-wrap gap-x-[22px] gap-y-1 border-b border-[#d9d3c7] py-[22px]"
        >
          {Object.entries(legalTitles).map(([key, title]) => (
            <Link
              key={key}
              href={`/${key}`}
              aria-current={key === slug ? 'page' : undefined}
              className="flex min-h-11 items-center text-xs aria-[current=page]:font-semibold aria-[current=page]:text-[#725535]"
            >
              {key === 'aszf' ? 'ÁSZF' : title}
            </Link>
          ))}
        </nav>

        {slug === 'impresszum' && <Impresszum />}
        {slug === 'adatkezeles' && <Adatkezeles />}
        {slug === 'aszf' && <Aszf />}
      </main>

      {/* Jogi oldalon nincs MobileBookingBar, tehát nem kell neki helyet hagyni. */}
      <Footer reserveBookingBarSpace={false} />
    </div>
  );
}

const pending = 'border-l-2 border-[#bb9362] pl-4 text-[#596963]';

/** Az üzemeltető adatai — mindhárom dokumentumban ugyanaz a blokk. */
function Operator() {
  return (
    <>
      <p>
        <strong>Al Sieady Marwan EV.</strong>
        <br />
        Székhely: 1067 Budapest, Csengery utca 66.
        <br />
        Adószám: 90449129-1-42
        <br />
        Egyéni vállalkozói nyilvántartási szám: 59641795
      </p>
      <p className={pending}>
        Az Oktogon impresszumából átvett vállalkozási adatok. A Karifoto
        üzemeltetőjére való alkalmazhatóságuk megerősítendő. A székhely nem
        jelenti automatikusan a fotóstúdió címét.
      </p>
      <p>
        Karifoto kapcsolat:{' '}
        <a href="mailto:info@karifoto.hu">info@karifoto.hu</a> ·{' '}
        <a href="tel:+36301086063">+36 30 108 6063</a>
      </p>
    </>
  );
}

function Impresszum() {
  return (
    <>
      <h2>Az oldal üzemeltetője</h2>
      <Operator />
      <h2>A szolgáltatás</h2>
      <p>
        A Karifoto budapesti, saját stúdióban szervezett karácsonyi fotózást
        kínál. A stúdióban két díszlet található: Hófehér és Retro. A Fényjáték
        a díszletekben igénybe vehető extra szolgáltatás.
      </p>
      <h2>Stúdió és tárhely</h2>
      <p className={pending}>
        Véglegesítendő: a stúdió pontos címe; a Karifoto tárhelyszolgáltatójának
        neve, címe és kapcsolattartási adatai; a vállalkozót nyilvántartó
        hatóság megnevezése. Az Oktogon Rackhost-adatait nem tekintjük
        automatikusan a Karifoto adataival azonosnak.
      </p>
      <h2>Kapcsolat és dokumentumok</h2>
      <p>
        Kérdéseddel a fenti elérhetőségeken fordulhatsz hozzánk. A fotózás
        feltételeit az <Link href="/aszf">ÁSZF</Link>, a személyes adatok
        kezelését az <Link href="/adatkezeles">adatkezelési tájékoztató</Link>{' '}
        ismerteti a véglegesítés után.
      </p>
    </>
  );
}

function Adatkezeles() {
  return (
    <>
      <h2>1. Az adatkezelő és elérhetősége</h2>
      <Operator />
      <h2>2. Kapcsolatfelvétel és foglalás</h2>
      <p>
        A kapcsolatfelvételhez megadott nevet, e-mail-címet, telefonszámot és
        üzenetet a megkeresés megválaszolására és a fotózás egyeztetésére
        használjuk. A foglalási és csomagadatok a választott szolgáltatás
        teljesítését segítik. A szerződés előkészítésének és teljesítésének
        jogalapja a GDPR 6. cikk (1) b) pontja. A foglalás önmagában nem
        hírlevél-feliratkozás.
      </p>
      <p className={pending}>
        A tényleges foglalási mezők, kötelező adatok, megőrzési határidők,
        számlázási adatkezelés és az általános megkeresések jogalapja a végleges
        működés alapján kiegészítendő.
      </p>
      <h2>3. Fotók és gyermekek képmása</h2>
      <p>
        A fotózás során a résztvevőkről képfelvételek készülnek. A képek
        elkészítését, válogatását, retusálását, átadását és tárolását külön kell
        választani azok nyilvános, reklám- vagy referenciacélú felhasználásától.
      </p>
      <p>
        Javasolt szabály: a nyilvános felhasználáshoz külön, önkéntes és
        visszavonható hozzájárulást kérünk; annak elutasítása nem akadálya a
        fotózásnak. Gyermekeknél a törvényes képviselő jogosultságát és
        nyilatkozatát is rendezni kell.
      </p>
      <p className={pending}>
        Véglegesítendő: a résztvevők adatkezelési jogalapjai, szülői
        nyilatkozat, az eredeti és retusált képek tárolási ideje, a galériák
        hozzáférése és lejárata, a törlés és biztonsági mentések rendje.
      </p>
      <h2>4. Szolgáltatók és adattovábbítás</h2>
      <p>
        Csak a feladatukhoz szükséges adatokhoz férhetnek hozzá a fotózás,
        retusálás és ügyintézés közreműködői, megfelelő jogosultságokkal és
        titoktartás mellett.
      </p>
      <p className={pending}>
        Az éles tárhely, levelezés, fizetés, számlázás és képgaléria
        szolgáltatóinak neve, szerepe, adatkezelési helye és esetleges EGT-n
        kívüli adattovábbítási garanciái még megadandók. Az Oktogon Gmail- és
        Rackhost-használata ezt nem igazolja a Karifotónál.
      </p>
      <h2>5. A jelenlegi oldal technikai működése</h2>
      <p>
        A jelenlegi bemutatóoldal helyben kiszolgált betűtípusokat használ. A
        csomagválasztás az oldal megnyitása alatt a böngésző memóriájában él.
        Saját analitikai vagy hirdetési követőkód nincs beépítve.
      </p>
      <p>
        A Google-térkép beágyazása betöltéskor, a YouTube-videó pedig a
        lejátszógomb megnyomásakor kapcsolatot létesít a Google
        szolgáltatásaival, amelynek során technikai adatok, például IP-cím
        továbbítódhatnak. A Facebook- és Instagram-hivatkozások külső oldalakra
        vezetnek.{' '}
        <a
          href="https://policies.google.com/privacy?hl=hu"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google adatvédelmi tájékoztató
        </a>
        .
      </p>
      <p className={pending}>
        Az éles rendszer sütijeit, naplózását, megőrzési időit és a külső
        beágyazásokhoz szükséges hozzájáruláskezelést az indulás előtt fel kell
        mérni és összehangolni e tájékoztatóval.
      </p>
      <h2>6. A jogaid</h2>
      <p>
        A jogszabályi feltételek szerint kérhetsz hozzáférést, helyesbítést,
        törlést, korlátozást és adathordozhatóságot; jogos érdeken alapuló
        kezelés ellen tiltakozhatsz. A hozzájárulásodat visszavonhatod, ami a
        korábbi jogszerű adatkezelést nem érinti. Kérelmedet a fenti
        e-mail-címre küldheted. Főszabály szerint egy hónapon belül választ
        kapsz.
      </p>
      <p>
        Panaszoddal a{' '}
        <a
          href="https://www.naih.hu/ugyfelszolgalat-kapcsolat"
          target="_blank"
          rel="noopener noreferrer"
        >
          Nemzeti Adatvédelmi és Információszabadság Hatósághoz
        </a>
        , illetve bírósághoz fordulhatsz.
      </p>
    </>
  );
}

function Aszf() {
  return (
    <>
      <h2>1. Szolgáltató és hatály</h2>
      <Operator />
      <p>
        A végleges feltételek a Karifoto online foglalható, budapesti karácsonyi
        fotózási szolgáltatására vonatkoznak. A szerződés nyelve magyar.
      </p>
      <h2>2. Mit tartalmaz a fotózás?</h2>
      <p>
        A választott csomag határozza meg a fotózás időtartamát, az igénybe
        vehető díszleteket, valamint az átadott és retusált képek mennyiségét.
        Hófehér és Retro két külön díszlet; a Fényjáték a díszletekben nyújtott
        extra szolgáltatás. A csomag tartalmát és az extrákat a megrendelés
        összesítése rögzíti.
      </p>
      <h2>3. Foglalás és szerződéskötés</h2>
      <p>
        Tervezett folyamat: csomag, díszlet, extrák és időpont kiválasztása;
        adatok megadása; a teljes rendelés és ár ellenőrzése; a hibák javítása;
        a feltételek megismerése; megrendelés és visszaigazolás.
      </p>
      <p className={pending}>
        Meghatározandó: mikor válik véglegessé az időpont, mely visszaigazolás
        hozza létre a szerződést, mi történik sikertelen fizetéskor, és hogyan
        őrzi meg a szolgáltató a szerződést. A bemutatóoldal önmagában nem
        igazolja az éles foglalórendszer működését.
      </p>
      <h2>4. Díjak és fizetés</h2>
      <p>
        A végleges megrendelésnek forintban, egyértelműen kell mutatnia a
        fizetendő teljes összeget, beleértve a stúdiódíjat és a választott
        extrákat. Utólagos szolgáltatás csak külön megállapodással rendelhető.
      </p>
      <p className={pending}>
        Megadandó: bruttó árak és adózási státusz, fizetési módok és határidők,
        előleg vagy foglaló összege és jogcíme, számlázás és visszatérítés
        menete. A foglaló és az előleg eltérő jogkövetkezményeit a választott
        működéshez kell igazítani.
      </p>
      <h2>5. Módosítás, betegség, lemondás</h2>
      <p>
        Kérjük, ha változtatnátok az időponton, jelezzétek a fenti
        elérhetőségeken. Az átfoglalás a szabad időpontoktól is függ.
      </p>
      <p className={pending}>
        Megerősítendő: az ingyenes átfoglalás határideje, betegség esetén
        alkalmazott szabályok, lemondási díj, késés, meg nem jelenés, valamint a
        szolgáltató általi lemondás és visszafizetés feltételei. A jelenlegi
        GYIK ígéreteit ezekkel egységesíteni kell.
      </p>
      <h2>6. Fogyasztói elállás és felmondás</h2>
      <p>
        A szerződéses lemondási szabályok nem korlátozhatják a fogyasztó
        kötelező jogszabályi jogait. A szolgáltatásra alkalmazható elállási és
        felmondási szabályokat, az esetleges kivételt és annak feltételeit a
        végleges foglalás előtt egyértelműen ismertetni kell.
      </p>
      <p className={pending}>
        Jogi minősítés alapján véglegesítendő a 14 napos jog, a határidőn belüli
        teljesítés kérése, az esetleges arányos díj és a nyilatkozatminta. A
        konkrét időpontra foglalt fotózást ebben a tervezetben nem tekintjük
        automatikusan elállási jog alóli kivételnek.
      </p>
      <h2>7. Képátadás és felhasználás</h2>
      <p className={pending}>
        Megadandó: átadási határidő és mód, válogatás és retusálás menete,
        fájlformátum, letöltési határidő, pótlás és archiválás. Külön rögzítendő
        a megrendelő személyes felhasználási joga, a további felhasználások
        rendje és a szerzői jogosult személye.
      </p>
      <p>
        Javasolt szabály: a fotók reklám- vagy portfóliócélú közzététele nem
        feltétele a fotózásnak; ehhez az érintettek külön hozzájárulása
        szükséges.
      </p>
      <h2>8. Panasz és jogérvényesítés</h2>
      <p>
        A szolgáltatással kapcsolatos panaszt az info@karifoto.hu címen vagy
        telefonon lehet jelezni. A kötelező fogyasztói és hibás teljesítésből
        eredő jogokat a végleges feltételek sem zárhatják ki.
      </p>
      <p className={pending}>
        Kiegészítendő a panaszkezelés jogszabályi rendje, határidői, a hibás
        teljesítési igények szabályai, az illetékes békéltető testület aktuális
        neve és elérhetősége, valamint az eljárási tájékoztatás.
      </p>
      <h2>9. Adatkezelés</h2>
      <p>
        A személyes adatok és a képfelvételek kezelésének részleteit az{' '}
        <Link href="/adatkezeles">adatkezelési tájékoztató</Link> tartalmazza.
      </p>
      <p className="border-t border-[#d9d3c7] pt-6">
        A véglegesítés jogszabályi alapja:{' '}
        <a
          href="https://njt.jog.gov.hu/jogszabaly/2014-45-20-22"
          target="_blank"
          rel="noopener noreferrer"
        >
          45/2014. (II. 26.) Korm. rendelet
        </a>
        .
      </p>
    </>
  );
}
