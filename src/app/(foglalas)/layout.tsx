import Image from 'next/image';
import Link from 'next/link';

import background from '@/photos/fenyjatek-gallery-6.jpg';

/**
 * A panel legalább a fejléc alatti teljes képernyőt kitölti (mobilon így sosem
 * villan ki a háttérkép a rövid tartalom alatt). A `svh` a mobil böngészők
 * összecsukódó címsorával is jól viselkedik.
 */
const PANEL_CLASS = [
  'relative min-h-[calc(100svh-60px)]',
  'sm:min-h-0 sm:rounded-[28px] sm:shadow-[0_24px_60px_rgba(14,38,32,.28)]',
].join(' ');

/**
 * A tejüveg maga külön réteg, nem a panelen ül: a `backdrop-filter` containing
 * blockot csinál a `position: fixed` leszármazottaknak, és akkor az oldalak
 * alján lévő rögzített CTA-sáv együtt görögne a tartalommal.
 */
const GLASS_CLASS = [
  'pointer-events-none absolute inset-0 bg-white/55 backdrop-blur-sm',
  'sm:rounded-[28px] sm:border sm:border-white/45',
].join(' ');

/**
 * A foglalási folyamat (időpont → űrlap → összegzés) közös kerete: rögzített
 * háttérkép, fejléc és tejüveg panel. Layoutként a lapok közti navigációnál nem
 * épül újra, így a háttér nem villan.
 */
export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen pb-33">
      {/*
        Rögzített háttér: a `fixed` réteg görgetéskor a helyén marad. A CSS-es
        `background-attachment: fixed` iOS Safariban nem működik, ezért külön elem.
      */}
      <div className="fixed inset-0 z-0 bg-forest">
        <Image
          src={background}
          alt=""
          fill
          priority
          sizes="100vw"
          placeholder="blur"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-linear-to-b from-forest/45 via-forest/25 to-forest/55" />
      </div>

      <header className="sticky top-0 z-40 flex items-center gap-3.5 border-b border-ink/12 bg-transparent px-4.5 py-4 backdrop-blur-[10px] sm:border-none sm:px-10 sm:backdrop-blur-none">
        <Link
          href="/"
          className="mr-auto text-cream transition-opacity hover:opacity-85"
        >
          <Image
            src="/images/karifoto-logo-krem.png"
            alt="Karifoto"
            width={353}
            height={146}
            priority
            className="h-7 w-auto lg:h-10"
          />
        </Link>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-152 sm:px-6 sm:pt-10">
        <div className={PANEL_CLASS}>
          <div className={GLASS_CLASS} />
          {/* A tartalom pozicionált, hogy az üvegréteg fölé kerüljön. */}
          <div className="relative">{children}</div>
        </div>
      </main>
    </div>
  );
}
