import type { ReactNode } from 'react';

import {
  EXTRA_FEE_PER_EXTRA_PERSON,
  EXTRA_BEAUTY_RETOUCH_PER_IMAGE,
  MAX_PERSONS,
  MAX_PERSONS_IN_PARTY_PACKAGE,
  EXTRA_EDIT_PER_IMAGE,
  EXTRA_FEE_PER_PET,
  EXPRESS_AFTERWORK_FEE,
  PHOTO_DELIVERY_DEADLINE_DAYS_AFTER_CLIENT_MADE_SELECTION_EXPRESS,
} from '@/lib/constants';
import { formatAmount } from '@/lib/utils';

/**
 * A GYIK válaszai formázott szöveget (kiemelés, bekezdések, árlisták)
 * tartalmaznak, ezért `ReactNode`-ként tároljuk őket, nem sima stringként.
 * A stílust a `Faq` komponens panelje adja (`strong`, `ul`, bekezdésköz).
 */
export type FaqItem = { q: string; a: ReactNode };

export const faqs: FaqItem[] = [
  {
    q: 'Hány fő jöhet a fotózásra?',
    a: (
      <>
        <p>
          Szeretnénk, hogy a fotózás ne kapkodás legyen, hanem élmény, és minden
          képen a legjobbat hozzuk ki belőletek. Ezért{' '}
          <strong>maximum {MAX_PERSONS} főt</strong> fotózunk egy alkalommal,
          így biztosítva, hogy mindenkire jusson elegendő figyelem és idő. 5 fő
          felett a plusz résztvevők díja +
          {formatAmount(EXTRA_FEE_PER_EXTRA_PERSON, 'HUF')}/fő.
        </p>
        <p>
          A Party csomagban viszont{' '}
          <strong>akár {MAX_PERSONS_IN_PARTY_PACKAGE}-en</strong> is jöhettek,
          hiszen másfél óra áll rendelkezésre és itt nincs létszámfelár!
        </p>
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
    q: 'Mikor érkezzünk a stúdióba?',
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
    q: 'Hogyan öltözzek a fotózáshoz?',
    a: (
      <>
        <p>
          Az öltözetet mindenki saját ízlése szerint választhatja, de érdemes{' '}
          <strong>egymással összehangolni színekben</strong> – így lesz igazán
          harmonikus és látványos a végeredmény.
        </p>
        <p>
          Fent minden díszlethez találsz egy kis inspirációt arról, milyen ruhák
          illenek hozzá a legjobban, de bátran engedjétek szabadon a
          kreativitást, és próbáljatok ki akár merészebb ötleteket is!
        </p>
        <p>
          Ha szeretnétek, hozhattok <strong>több szettet</strong> is, így a
          nagyobb csomagoknál át is tudtok öltözni a fotózás közben.
        </p>
        <p>
          És ha egy kis mókára vágytok: játékos kellékeinkkel —{' '}
          <strong>mikulássapka, szarvasagancs</strong> és más vidám kiegészítők
          — bármikor feldobhatjátok a hangulatot, és bolondosabb képeket is
          készíthetünk!
        </p>
      </>
    ),
  },
  {
    q: 'Hozhatok kellékeket?',
    a: (
      <p>
        Igen, bármi, ami szerintetek emeli a szereplők, vagy a kép hangulatát,
        mi szívesen látjuk.
      </p>
    ),
  },
  {
    q: 'Mennyi fotó készül?',
    a: (
      <>
        <p>
          Egy stúdiófotózás során rengeteg – <strong>akár több száz</strong> –
          pillanatot megörökítünk, hogy biztosan mindenki megtalálja a
          kedvenceit. A fotózás után pár nappal már le is tölthetitek az összes
          képet, és kiválaszthatjátok belőle, melyek kerüljenek kidolgozásra.
        </p>
        <p>
          Azért készítünk ilyen sok felvételt, mert a családi fotózás igazi kis
          kaland: valaki épp elnéz, a picik elkapnak egy mosolyt vagy lehunyják
          a szemüket – és mi szeretnénk{' '}
          <strong>minden vidám, spontán pillanatot megőrizni</strong>, hogy
          legyen miből válogatni.
        </p>
      </>
    ),
  },
  {
    q: 'Mit értünk a képek szerkesztése alatt?',
    a: (
      <>
        <p>
          Karácsonyi fotózás esetén az utómunka során a{' '}
          <strong>meghitt hangulatú fényelésen</strong> van a fő hangsúly.
          Persze ha valakin feltűnik egy-egy pattanás vagy heg, azt kérésre
          eltüntethetjük a képekről, de{' '}
          <strong>a bőrretus nem tartozik bele</strong> a szolgáltatásba.
        </p>
        <p>
          Aki bőrretusra tart igényt, annak módja van rá a karácsonyi fotózás
          képei esetén is. Ebben az esetben a <strong>Beauty Retouch</strong>{' '}
          szolgáltatásunkra való igényét kérjük, előre jelezze (ill. hogy mely
          képek esetén tart rá igényt).
        </p>
        <ul>
          <li>
            <strong>
              Beauty Retouch –{' '}
              {formatAmount(EXTRA_BEAUTY_RETOUCH_PER_IMAGE, 'HUF')}
              /kép
            </strong>
          </li>
        </ul>
      </>
    ),
  },
  {
    q: 'Mi lesz a nyers fotókkal?',
    a: (
      <>
        <p>
          A nyers képeket a karácsonyi fotózás másnapján feltöltjük egy
          képválogató oldalra, ahonnan könnyedén le tudjátok őket tölteni.
          Ezután egyszerűen ki tudjátok jelölni a legjobb képeket, amit a
          következő év <strong>január 15.</strong>-ig tehettek meg, mert{' '}
          <strong>akkor töröljük a nyers képeket</strong>. Visszajelzés után
          megszerkesztjük őket, és az elkészült fotókat fájlmegosztó oldalon
          osztjuk meg, ahonnan egy kattintással le lehet őket tölteni.
        </p>
        <p>
          Természetesen, ha bárki elakadna, mi telefonon elérhetők vagyunk, és
          szívesen segítünk.
        </p>
        <p>
          Aki karácsony előtt eljön, az mindenképpen fog kapni képeket
          karácsonyig, ugyanis a képeket addig feltöltjük, és le tudjátok majd
          tölteni, ill. átválogatni őket. Ezek a képek még nyers képek lesznek
          (ahogy a gépből kijönnek), tehát nem a kész képek, de már így is elég
          jól néznek ki.
        </p>
        {/* TODO: "Mutatunk nektek párat:" nyers példaképek (src/photos-ból, statikus importtal) */}
      </>
    ),
  },
  {
    q: 'Mi van, ha több szerkesztett képet szeretnék, mint amennyi a csomagban van?',
    a: (
      <>
        <p>
          Kérheted az általad választott további képek szerkesztését is. Az
          utómunka díja ez esetben{' '}
          <strong className="nowrap">
            {formatAmount(EXTRA_EDIT_PER_IMAGE, 'HUF')}
          </strong>{' '}
          /kép (csak a <strong>csomagban foglalt mennyiség feletti</strong>{' '}
          darabszámra vonatkozik).
        </p>
      </>
    ),
  },
  {
    q: 'Mi történik utána a kiválasztott képekkel?',
    a: (
      <p>
        A szerkesztés 5 lépést foglal magába: szín-, kontraszt- és
        fényerő-korrekció, valamint cropping, azaz képkivágás-javítás. Ezek után
        pedig kreatív fényelés és véglegesítés után JPG formátumban mentjük el
        őket, majd a kész képeket fájlmegosztó oldalról lehet letölteni.
      </p>
    ),
  },
  {
    q: 'Kinek a tulajdonát képezik az elkészült fényképek?',
    a: (
      <>
        <p>
          A kész fotók a vevő tulajdonát képezik, szabadon felhasználhatók, a
          szerző feltüntetése nem szükséges.
        </p>
        <p>
          Figyelem: a jól sikerült fotókat néha kitesszük a weblapunkra. Ha
          bárkit ez zavar, akkor kérjük, előre jelezze, ez esetben nem kerülnek
          ki a képek.
        </p>
      </>
    ),
  },
  {
    q: 'Kerül-e vízjel a fényképekre?',
    a: (
      <p>
        Nem. A fényképek kiadása után a vevő tulajdonát képezik, bármire
        szabadon felhasználhatók.
      </p>
    ),
  },
  {
    q: 'Milyen minőségben tölthetjük le a képeket?',
    a: (
      <p>
        A kész képeket <strong>JPG</strong> formátumban lehet letölteni.
      </p>
    ),
  },
  {
    q: 'Mennyi idő alatt készülnek el a szerkesztett képek?',
    a: (
      <>
        <p>
          A fotókat a <strong>fotózás utáni napon töltjük fel</strong>, és innen{' '}
          <strong>azonnal le is lehet őket tölteni</strong>, illetve ki lehet
          válogatni a legjobbakat szerkesztésre.
        </p>
        <p>
          A szerkesztett képeket a <strong>kiválogatás után 1 héttel</strong>{' '}
          adjuk át digitálisan letölthető formában (e-mailben küldünk egy
          linket, ahonnan le tudjátok tölteni őket).
        </p>
        <p>
          Aki hamarabb szeretné megkapni a kész képeket, az kérheti az{' '}
          <strong>
            expressz utómunka (+{formatAmount(EXPRESS_AFTERWORK_FEE, 'HUF')})
          </strong>{' '}
          szolgáltatásunkat. Ebben az esetben a képeket (a kiválasztás után){' '}
          <strong>
            {PHOTO_DELIVERY_DEADLINE_DAYS_AFTER_CLIENT_MADE_SELECTION_EXPRESS}{' '}
            napon
          </strong>{' '}
          belül elkészítjük.
        </p>
      </>
    ),
  },
  {
    q: 'Milyen zene szól a fotózás alatt?',
    a: (
      <p>
        Ha nincs külön kérés, akkor a hangulat érdekében{' '}
        <strong>karácsonyi zenét</strong> teszünk be, de természetesen aki mást
        szeretne, az kérhet bármilyen zenét. A lényeg, hogy jó hangulatban
        teljen a karácsonyi fotózás.
      </p>
    ),
  },
  {
    q: 'Mi történik, ha mégsem jó az időpont?',
    a: (
      <>
        <p>
          Mindenkit arra kérünk, hogy ha bármi közbejön, és a lefoglalt időpont
          mégsem jó, <strong>minél hamarabb jelezzétek</strong> felénk.
        </p>
        <p>Ha időben szóltok, mindig találunk másik időpontot.</p>
      </>
    ),
  },
  // TODO: szöveg pontosítása ("panda stúdió")
  {
    q: 'Hozhatunk-e kutyát / cicát a fotózásra?',
    a: (
      <>
        <p>
          Igen. A panda stúdió <strong>kisállat-barát</strong> hely. Amennyiben
          kedvenced szobatiszta, hozhatod a fotózásra. A fotózás{' '}
          <strong>
            extra díja {formatAmount(EXTRA_FEE_PER_PET, 'HUF')} / kisállat
          </strong>
          .
        </p>
        <p>
          Szabályok: bár bejöhet kedvencetek a stúdióba, elengedni nem szabad,
          tehát amikor éppen nem vesz részt a fotózásban, akkor is{' '}
          <strong>valakinek mindig vigyáznia kell rá</strong>.
        </p>
      </>
    ),
  },
  // TODO: szöveg pontosítása (a foglaló Stripe-on megy, nem készpénzben)
  {
    q: 'Hogyan történik a fizetés?',
    a: (
      <p>
        Fizetni a <strong>helyszínen</strong> tudtok,{' '}
        <strong>csak készpénzzel</strong>.
      </p>
    ),
  },
  {
    q: 'Hogy néznek ki a nyers képek, amelyeket közvetlenül a fotózás másnapján küldünk el?',
    a: (
      <>
        <p>
          A képeket, amiket közvetlenül a fotózás utáni napon (vagy pár napon
          belül) megkaptok, mind olyan formában kapjátok, ahogy nálunk a gépből
          kijönnek (nyers képek). Mivel a szerkesztés során javítjuk ki az
          esetleges hibákat, így a nyers képek esetében feltűnhetnek azok (pl.
          ilyesmik, hogy valakinek az arca kevésbé világos, mint a többieké). Az
          ilyesmi minden fotózáson megtörténik, és utómunkában szokták javítani,
          amennyiben a képet kiválasztják.
        </p>
        {/* " Pár példát feltettünk ide nektek,
          hogy lássátok, milyenek." TODO: nyers példaképek (src/photos-ból, statikus importtal) */}
        <p>
          <strong>
            Aki karácsony előtt eljön, annak ezeket a képeket karácsonyig
            mindenképpen átadjuk.
          </strong>
        </p>
      </>
    ),
  },
];
