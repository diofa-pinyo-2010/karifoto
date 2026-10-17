import type { ReactNode } from 'react';

import { PhotoGallery } from '@/components/PhotoGallery';
import { PACKAGES } from '@/lib/catalog';
import {
  EXTRA_BEAUTY_RETOUCH_PER_IMAGE,
  EXTRA_EDIT_PER_IMAGE,
  EXTRA_FEE_PER_PET,
  PHOTO_DELIVERY_DEADLINE_DAYS_AFTER_CLIENT_MADE_SELECTION,
  DEPOSIT_AMOUNT,
  MAX_PERSONS_EXCLUDED_PARTY,
  WEEKDAY_DISCOUNT_AMOUNT,
} from '@/lib/constants';
import { faqImages } from '@/lib/fetch-photos';
import { formatMoney } from '@/lib/utils';

/**
 * A GYIK válaszai formázott szöveget (kiemelés, bekezdések, árlisták)
 * tartalmaznak, ezért `ReactNode`-ként tároljuk őket, nem sima stringként.
 * A stílust a `Faq` komponens panelje adja (`strong`, `ul`, bekezdésköz).
 */
export type FaqItem = { slug: string; q: string; a: ReactNode };

const clientPortalLink = (
  <a
    href="#faq-ugyfelportal"
    className="font-bold text-brand-ink underline underline-offset-2"
  >
    ÜGYFÉLPORTÁL
  </a>
);

export const faqs: FaqItem[] = [
  {
    slug: 'faq-letszam',
    q: '1. Hány fő jöhet a fotózásra?',
    a: (
      <>
        <p>
          Szeretnénk, hogy a fotózás ne kapkodás legyen, hanem élmény, és minden
          képen a legjobbat hozzuk ki belőletek. Ezért{' '}
          <strong>maximum {MAX_PERSONS_EXCLUDED_PARTY} főt</strong> fotózunk egy
          alkalommal, így biztosítva, hogy mindenkire jusson elegendő figyelem
          és idő.
        </p>
        {/* <p>
          A Party csomagban viszont{' '}
          <strong>akár {PACKAGES.PARTY.maxGuests}-en</strong> is jöhettek,
          hiszen másfél-két óra áll rendelkezésre!
        </p> */}
      </>
    ),
  },
  // {
  //   q: 'Hogyan kérhetek ajándékkártyát?',
  //   a: (
  //     <p>
  //       Rendeléskor jelezd felénk, hogy ajándékba lesz a fotózás, ill. küldd el,
  //       hogy milyen névre szeretnéd, ha kiállítanánk az ajándékutalványt. Később
  //       (1 napon belül) grafikusunk megszerkeszti a kártyát, és nyomtatható
  //       formában elküldjük neked.
  //     </p>
  //   ),
  // },
  {
    slug: 'faq-erkezes',
    q: '2. Mikor érkezzünk a stúdióba?',
    a: (
      <>
        <p>
          Ideális esetben{' '}
          <strong>5-10 perccel a megbeszélt időpont előtt</strong>.
        </p>
        <p>
          Mindenkit megkérünk, hogy ne késsetek, vagy ha mégis, akkor kérjük,
          jelezzétek időben.
        </p>
        <p>Korábbi érkezés esetén a stúdió előtermében lehet várakozni.</p>
      </>
    ),
  },
  {
    slug: 'faq-oltozet',
    q: '3. Hogyan öltözzek a fotózáshoz?',
    a: (
      <>
        <p>
          Öltözzetek bátran! Legyen szó elegáns, otthonos vagy épp egy
          klasszikus "karácsonyi csúnya pulcsis" szettről, amire érdemes
          figyelni, hogy <strong>színekben egymással összeillő legyen</strong>.
          Az öltözék színharmóniája sokszor többet ad a kép végeredményéhez,
          mint maga a választott stílus.
        </p>
        <p>
          Ha mindez még a díszletek színeihez is passzol, akkor már csak pár
          mosoly, egy összenézés, vagy épp egy családi ölelés, és készülhetnek
          is az igazán varázslatos képek.
        </p>
        <p>
          Fotózásaink az idő nagy részében{' '}
          <strong>cipő nélkül, otthonos hangulatban</strong>
          zajlanak, így a készülődésnél érdemes a zoknik színét is szemügyre
          venni.
        </p>
        <p>
          Minden díszlethez írtunk egy kis inspirációt, milyen öltözetet
          ajánlunk hozzá, de bátran legyetek kreatívak. Fotózásunk otthonos
          hangulata miatt például az <strong>egyenpizsama</strong> mindig jó
          választás és fotósaink partnerek minden egyedi ötlet megvalósításában
          is.
        </p>
        <p>
          Ha szeretnétek, hozhattok <strong>több szettet</strong>, így a nagyobb
          csomagoknál át is tudtok öltözni a fotózás közben. Vidám
          kiegészítőinket – szarvas agancs, mikulás sapka, mókás szemüveg – is
          használhatjátok, ha szeretnétek pár mókásabb hangulatú fotót.
        </p>
      </>
    ),
  },
  {
    slug: 'faq-kellekek',
    q: '4. Hozhatok kellékeket?',
    a: (
      <p>
        Igen, bármi, ami szerintetek emeli a szereplők, vagy a kép hangulatát,
        mi szívesen látjuk. Például a kisgyerek játékát, a nagy gyerek
        sportszerét, vagy bármit amit szívesen látnátok viszont a képeiteken.
        Fotósaink minden egyedi megoldásban partnerek.
      </p>
    ),
  },
  {
    slug: 'faq-fotok-szama',
    q: '5. Mennyi fotó készül?',
    a: (
      <>
        <p>
          Fotózásainkon akár több száz fotó készül, hogy elkapjunk minden apró
          gesztust, kósza mosolyt, vagy épp meghitt pillanatot.
        </p>
        <p>
          A felszabadult hangulatban (1-2 beállított családi fotót leszámítva)
          minden pillanat kiszámíthatatlan,{' '}
          <strong>mi mindet megörökítjük</strong>, majd a fotózáson készült{' '}
          <strong>összes képet átadjuk</strong>, hogy ebből választhassátok ki
          melyik gesztusokban találtok magatokra. Tapasztalatunk, hogy ez minden
          családban egyedi.
        </p>
      </>
    ),
  },
  {
    slug: 'faq-szerkesztes',
    q: '6. Mit értünk a képek szerkesztése alatt?',
    a: (
      <>
        <p>Karácsonyi fotózásnál képszerkesztésnél a képeket:</p>
        <ul>
          <li>megfényeljük a meghitt hangulatért,</li>
          <li>javítjuk a kép színeit és a kontrasztot,</li>
          <li>igazítjuk a dőlést és optimalizáljuk a képkivágást. </li>
        </ul>
        <p>
          A bőrretus nem az utómunka része, mint a portré fotózásokon, de
          kérésre egy-egy pattanást vagy heget eltávolítunk.
        </p>
        <p>
          (A csomagotok tartalmaz csomagtól függően{' '}
          {Object.values(PACKAGES)
            .filter((pgk) => pgk.visibility === 'pricingTable')
            .map((pkg) => pkg.editedImagesAllowance)
            .join(', ')}{' '}
          darab szerkesztett képet, de kérhettek pluszban{' '}
          {formatMoney(EXTRA_EDIT_PER_IMAGE)}/kép áron amennyit szeretnétek. A
          képek kiválasztásánál ha többet jelölnétek, a válogatás befejezésekor
          egyből ki is tudjátok egyenlíteni a különbözetet bankkártyával.)
        </p>
        <p>
          Ha szeretnétek portré fotó jellegű bőrretusálást is a karácsonyi
          képekre erre is van lehetőség. Képválogatásnál ezt a{' '}
          <strong>fekete zászlóval</strong> tudjátok jelölni. Ha végeztetek a
          válogatással, {clientPortalLink}-on a megjegyzésbe írjátok le, hogy
          mit szeretnétek ezeknél a képeknél (pl fogfehérítést, bőrretust,
          esetleg egy nagyobb sebhely eltüntetését), hogy retusőrünk minél
          jobban azt tudja nektek adni amit látni szeretnétek.
        </p>
        <ul>
          <li>
            Beauty Retouch – {formatMoney(EXTRA_BEAUTY_RETOUCH_PER_IMAGE)}/kép
          </li>
        </ul>
      </>
    ),
  },
  {
    slug: 'faq-nyers-fotok',
    q: '7. Mi lesz a nyers fotókkal?',
    a: (
      <>
        <p>
          A fotózás másnapján feltöltjük őket egy képválogató oldalra, amit az{' '}
          {clientPortalLink}-on keresztűl tudtok egyszerűen elérni. Innen
          könnyedén le tudjátok tölteni az összes képet, illetve itt tudjátok
          azt is kiválogatni melyikeket szeretnétek szerkesztve. Onnantól
          kezdve, hogy ez megtörtént,{' '}
          <strong>
            {PHOTO_DELIVERY_DEADLINE_DAYS_AFTER_CLIENT_MADE_SELECTION} napon
            belül
          </strong>{' '}
          küldjük nektek a szerkesztett képeket is, amiket ugyancsak elértek az
          Ügyfélportálon keresztül.
        </p>
        <p>
          A képeket <strong>január 15-én töröljük</strong>, előtte töltsétek le
          mindenképp!
        </p>
        <p>
          Ha karácsony előtt eljöttök hozzánk mindenképp elküldjük nektek a nagy
          felbontású nyers fotókat, amik már akkor is elég szépek, sokan nem is
          kérik a szerkesztést. Mutatunk pár példát nyers fotóinkból
          (kattintsatok a nagyobb mérethez):
        </p>
        <PhotoGallery photos={faqImages.question_7} />
      </>
    ),
  },
  {
    slug: 'faq-extra-kepek',
    q: '8. Több szerkesztett képet szeretnétek, mint amennyi a csomagban van?',
    a: (
      <>
        {/* <p>
          Kérheted az általad választott további képek szerkesztését is. Az
          utómunka díja ez esetben{' '}
          <strong className="nowrap">
            {formatMoney(EXTRA_EDIT_PER_IMAGE)}
          </strong>{' '}
          /kép (csak a <strong>csomagban foglalt mennyiség feletti</strong>{' '}
          darabszámra vonatkozik).
        </p> */}
        <p>A csomag felár mentesen tartalmazza:</p>
        <ul>
          {Object.values(PACKAGES)
            .filter((pkg) => pkg.visibility === 'pricingTable')
            .map((pkg) => (
              <li key={pkg.slug}>
                {pkg.label} csomag:{' '}
                <strong>{pkg.editedImagesAllowance} db</strong> szerkesztett
                fotó
              </li>
            ))}
        </ul>
        <p>
          Ha ennél többet szeretnétek, kérhettek pluszban a válogatásnál{' '}
          <strong>{formatMoney(EXTRA_EDIT_PER_IMAGE)}</strong>/szerkesztett fotó
          áron.
        </p>
        <p>
          {clientPortalLink}-unk a válogatás befejezésével ezt egyből
          kiszámolja, és tudjátok kényelmesen kártyával fizetni.
        </p>
      </>
    ),
  },
  {
    slug: 'faq-kivalasztott-kepek',
    q: '9. Mi történik a kiválasztott képekkel?',
    a: (
      <p>
        A kiválasztott képeket megszerkesztjük, majd a kiválasztástól számított{' '}
        <strong>
          {PHOTO_DELIVERY_DEADLINE_DAYS_AFTER_CLIENT_MADE_SELECTION} napon belül
        </strong>{' '}
        feltöltjük nektek az {clientPortalLink}-ra, ahonnan nagy felbontású
        JPG-ként tudjátok letölteni őket egy kattintással.
      </p>
    ),
  },
  {
    slug: 'faq-tulajdonjog',
    q: '10. Kinek a tulajdonát képezik az elkészült fényképek?',
    a: (
      <>
        <p>
          A kész fotók a ti tulajdonotok, használhatjátok őket ahogy
          szeretnétek, nem szükséges minket megjelölni rajtuk.
        </p>
        <p>
          A jól sikerült fotóinkból teszünk ki a weblapunkra, hogy későbbi
          vendégeink is láthassák, mire számíthatnak. Akit ez zavar, kérjük
          előre jelezze, ez esetben nem kerülnek ki a jól sikerült képei sem.
        </p>
      </>
    ),
  },
  {
    slug: 'faq-vizjel',
    q: '11. Kerül-e vízjel a fényképekre?',
    a: (
      <p>
        Nem. A fényképeket vízjel nélkül le lehet tölteni az {clientPortalLink}
        -ról és szabadon felhasználhatóak.
      </p>
    ),
  },
  {
    slug: 'faq-kepminoseg',
    q: '12. Milyen minőségben tölthetjük le a képeket?',
    a: (
      <p>
        A kész képeket <strong>nagy felbontású JPG</strong> formátumban lehet
        letölteni.
      </p>
    ),
  },
  {
    slug: 'faq-atfutasi-ido',
    q: '13. Mennyi idő alatt készülnek el a szerkesztett képek?',
    a: (
      <>
        <p>
          A nyers fotókat a <strong>fotózás utáni napon</strong> töltjük fel. Az{' '}
          {clientPortalLink}-on eléritek (de küldünk róla egy emailt is),
          ahonnan egyből le is tölthethetitek, valamint online meg is tudjátok
          jelölni melyikeket szeretnétek szerkesztve.
        </p>
        <p>
          Amint végeztetek a válogatással az {clientPortalLink}-on jelezzétek és
          onnantól számított{' '}
          <strong>
            {PHOTO_DELIVERY_DEADLINE_DAYS_AFTER_CLIENT_MADE_SELECTION} napon
            belül
          </strong>
          feltöltjük nektek a kész szerkesztett fotókat is, amit ugyancsak
          elértek. Na hol? Igen, az {clientPortalLink}-on :-)
        </p>
      </>
    ),
  },
  {
    slug: 'faq-zene',
    q: '14. Milyen zene szól a fotózás alatt?',
    a: (
      <p>
        A fotózás alatt általában <strong>karácsonyi zene</strong> szól, de ha
        szeretnétek, kérhettek bármi mást is, ami nektek jobban feldobja a
        hangulatot.
      </p>
    ),
  },
  {
    slug: 'faq-idopont-modositas',
    q: '15. Mi történik, ha mégsem jó az időpont?',
    a: <p>Ha időben jelzitek mindig találunk másik időpontot.</p>,
  },
  {
    slug: 'faq-kisallat',
    q: '16. Hozhatunk-e kutyát, cicát, nyuszit?',
    a: (
      <>
        <p>
          Igen, a Karifoto stúdió <strong>kisállat-barát</strong> hely. A
          kisgyerekes családokra tekintettel mindenkit megkérünk, hogy{' '}
          <strong>csak szobatiszta, frissen fürdetett</strong> kedvencével
          érkezzen.{' '}
        </p>
        <p>
          A fotózás minőségének megőrzése érdekében{' '}
          <strong>pár szabályt viszont be kell tartani</strong>. Elengedni nem
          lehet, valakinek mindig vigyáznia kell rá, akkor is amikor a
          kiskedvenc épp nem szerepel. Ehhez akár plusz kísérő is érkezhet a
          fotózásra.
        </p>
        <p>
          Illetve kifejezetten tanácsos, szinte elengedhetetlen a jutifalat!
        </p>
        <p>
          Az kisállat fotózás extra díja{' '}
          <strong>{formatMoney(EXTRA_FEE_PER_PET)}</strong> / kiskedvenc.
        </p>
      </>
    ),
  },
  {
    slug: 'faq-fizetes',
    q: '17. Hogyan történik a fizetés?',
    a: (
      <>
        <p>
          A foglalást <strong>{formatMoney(DEPOSIT_AMOUNT)}</strong> bankkártyás
          (Stripe) befizetéssel véglegesítitek. A fennmaradó összeget a
          fotózáskor a helyszínen fizethetitek <strong>készpénzzel</strong> vagy{' '}
          <strong>bankkártyával</strong>:
        </p>
        <ul>
          <li>Visa</li>
          <li>Mastercard</li>
          <li>Google Pay</li>
          <li>Apple Pay</li>
          <li>American Express</li>
        </ul>
      </>
    ),
  },
  {
    slug: 'faq-foglalas-utan',
    q: '18. Mi történik a foglalás után?',
    a: (
      <>
        <p>
          A foglaló befizetése után pár percen belül kaptok tőlünk egy{' '}
          <strong>visszaigazoló e-mailt</strong>. Ebben benne van a fotózás
          időpontja, egy gomb, amivel a naptáratokba is beírhatjátok, és egy{' '}
          <strong>„Ügyfélportál” gomb</strong>.
        </p>
        <p>
          Ezután nincs más dolgotok, mint eljönni a stúdióba a megbeszélt
          időpontban. A fotózás után feltöltjük a nyers képeket, és{' '}
          <strong>e-mailben jelezzük</strong>, amikor kiválogathatjátok a
          kedvenceiteket — minden további lépésről is így értesítünk.
        </p>
        <p>
          Ha nem találjátok a visszaigazoló e-mailt, nézzétek meg a
          spam/promóciók mappát is, vagy írjatok nekünk.
        </p>
      </>
    ),
  },
  {
    slug: 'faq-ugyfelportal',
    q: '19. Mi az az ÜGYFÉLPORTÁL, és mire jó?',
    a: (
      <>
        <p>
          Az Ügyfélportál a <strong>saját oldalatok</strong> a weboldalunkon,
          ahol a fotózásotokkal kapcsolatban minden egy helyen megtalálható. Nem
          kell hozzá regisztrálni, sem jelszót megjegyezni: elég a visszaigazoló
          e-mailben lévő <strong>„Ügyfélportál” gombra</strong> kattintani, és
          már bent is vagytok.
        </p>
        <p>Itt tudjátok:</p>
        <ul>
          <li>
            megnézni a foglalás <strong>részleteit</strong> (időpont, csomag,
            díszlet, a stúdió címe),
          </li>
          <li>
            a fotózás után <strong>kiválogatni a képeket</strong>, amelyeket
            szerkesszünk,
          </li>
          <li>
            nyomon követni, <strong>hol tart</strong> a képeitek elkészítése,
          </li>
          <li>
            megtalálni a <strong>befizetéseket és a számlákat</strong>,
          </li>
          <li>
            a végén pedig innen érhetitek el a{' '}
            <strong>kész képek linkjét</strong> is.
          </li>
        </ul>
        <p>
          A gomb <strong>nem jár le</strong>, hónapokkal később, másik
          telefonról vagy gépről is működik — ezért érdemes megtartani a
          visszaigazoló e-mailt. Ha mégis elveszne, írjatok nekünk, és segítünk.
        </p>
      </>
    ),
  },
  {
    slug: 'faq-nyers-kepek-kinezete',
    q: '20. Hogy néznek ki a nyers képek, amelyeket közvetlenül a fotózás másnapján küldünk el?',
    a: (
      <>
        <p>
          A nyers képeket adjuk át, amiben benne van az akár több száz készült
          fotó. Ezekben benne lesznek a hibás és a jól sikerült képek is, hogy
          az összesből tudjátok kiválasztani melyikeket szeretnétek szerkesztve,
          illetve melyikeket szeretnétek felhasználni ebben a formában, mert
          lesznek köztük olyanok, amik már a nagyfelbontású nyers képen is
          szuperek és használhatóak.
        </p>
        <p>
          Ha karácsony előtt eljöttök fotózásra, akkor a nyers képeket
          mindenképp megkapjátok karácsonyig!
        </p>
      </>
    ),
  },
  {
    slug: 'faq-hetkoznapi-kedvezmeny',
    q: '21. Hétköznapi kedvezmény?',
    a: (
      <>
        <p>
          Igen. Bár nem mindig elérhetőek a hétköznapi fotózásaink, de idén az
          összes hétköznapi időpontra{' '}
          <strong>{formatMoney(WEEKDAY_DISCOUNT_AMOUNT)}</strong> kedvezményt
          adunk.
        </p>
      </>
    ),
  },
];
