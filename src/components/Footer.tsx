import Image from 'next/image';
import Link from 'next/link';

const linkClass =
  'flex min-h-11 items-center gap-2.5 text-sm transition-colors hover:text-[#e6be88]';
const rowClass = 'justify-between md:justify-start';
// Ugyanaz a hover, mint a körvonalas gomboké: halvány háttér és a
// szöveghez igazodó keret (`border-current`).
const socialClass =
  'justify-center rounded-[10px] border border-white/30 px-2 py-2.5 hover:border-current hover:bg-[#b3c9c51a]';

/**
 * 2026-os arculat. A korábbi egysoros lábléc helyett három csoport (elérhetőség,
 * közösségi oldalak, jogi dokumentumok), fölötte márkasor, alatta záró sáv.
 *
 * A mobil alsó belső margó (`pb-[calc(100px+env(safe-area-inset-bottom))]`) a
 * `MobileBookingBar`-nak tart helyet; amíg az nincs kész, ott üres sáv marad.
 * Az `env(safe-area-inset-bottom)` az iPhone-ok alsó indikátorsávja miatt kell.
 */
export function Footer() {
  return (
    <footer className="bg-[#102a31] bg-[radial-gradient(ellipse_at_10%_0%,#36565677,transparent_60%)] pt-8 pb-[calc(100px+env(safe-area-inset-bottom))] font-brand-sans text-brand-cream md:pt-12 md:pb-28 lg:pb-7">
      <div className="brand-shell">
        <div className="flex flex-col items-center gap-5 pb-7 text-center md:flex-row md:items-center md:justify-between md:gap-7 md:pb-10 md:text-left lg:justify-around lg:gap-10">
          <Link href="/" aria-label="Karifoto – kezdőlap">
            <Image
              src="/images/karifoto-logo-krem.png"
              alt="Karifoto"
              width={353}
              height={146}
              className="h-9 w-auto lg:h-10"
            />
          </Link>

          <p className="font-display text-[28px] leading-tight md:text-3xl">
            A pillanat elmúlik.
            <br />
            <em className="text-[#c8b68d]">Az érzés veletek marad.</em>
          </p>

          <Link
            href="/#foglalas"
            className="inline-flex min-h-12 w-full items-center justify-center gap-5 rounded-lg border border-[#c4cebc66] px-5 py-3 text-[13px] font-semibold transition-[background-color,border-color] duration-200 hover:border-current hover:bg-[#b3c9c51a] md:min-h-11 md:w-auto md:text-[11px]"
          >
            Találkozzunk karácsonykor <span aria-hidden="true">↗</span>
          </Link>
        </div>

        <div className="grid gap-7 border-t border-white/15 py-7 md:grid-cols-[1fr_1.2fr_1fr] md:gap-10 lg:flex lg:items-start lg:justify-around lg:gap-10">
          <div>
            <h2 className="mb-3 text-[11px] font-semibold tracking-[.12em] text-[#d3bb93] uppercase">
              Kérdésed van?
            </h2>
            <div className="grid gap-0.5">
              <a href="tel:+36301086063" className={`${linkClass} ${rowClass}`}>
                +36 30 108 6063{' '}
                <span aria-hidden="true" className="text-[#c8b68d]">
                  ↗
                </span>
              </a>
              <a
                href="mailto:info@karifoto.hu"
                className={`${linkClass} ${rowClass}`}
              >
                info@karifoto.hu{' '}
                <span aria-hidden="true" className="text-[#c8b68d]">
                  ↗
                </span>
              </a>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-[11px] font-semibold tracking-[.12em] text-[#d3bb93] uppercase">
              Kövess minket
            </h2>
            <nav
              aria-label="Közösségi oldalaink"
              className="grid grid-cols-2 gap-3"
            >
              <a
                href="https://www.instagram.com/karifoto.hu/"
                target="_blank"
                rel="noopener noreferrer"
                className={`${linkClass} ${socialClass}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                  className="size-[18px] shrink-0"
                >
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle
                    cx="17.5"
                    cy="6.5"
                    r=".8"
                    fill="currentColor"
                    stroke="none"
                  />
                </svg>
                Instagram{' '}
                <span aria-hidden="true" className="text-[#c8b68d]">
                  ↗
                </span>
              </a>
              <a
                href="https://www.facebook.com/karifoto"
                target="_blank"
                rel="noopener noreferrer"
                className={`${linkClass} ${socialClass}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                  className="size-[18px] shrink-0"
                >
                  <path d="M14 22v-9h3l.5-4H14V7c0-1 .3-2 2-2h2V1.4A23 23 0 0 0 15 1c-3 0-5 1.8-5 5v3H7v4h3v9z" />
                </svg>
                Facebook{' '}
                <span aria-hidden="true" className="text-[#c8b68d]">
                  ↗
                </span>
              </a>
            </nav>
          </div>

          <div>
            <h2 className="mb-3 text-[11px] font-semibold tracking-[.12em] text-[#d3bb93] uppercase">
              Hasznos tudnivalók
            </h2>
            <nav
              aria-label="Jogi információk"
              className="grid gap-0.5 text-[#e2e3d8]"
            >
              <Link href="/impresszum/" className={`${linkClass} ${rowClass}`}>
                Impresszum{' '}
                <span aria-hidden="true" className="text-[#c8b68d]">
                  →
                </span>
              </Link>
              <Link href="/adatkezeles/" className={`${linkClass} ${rowClass}`}>
                Adatkezelési tájékoztató{' '}
                <span aria-hidden="true" className="text-[#c8b68d]">
                  →
                </span>
              </Link>
              <Link href="/aszf/" className={`${linkClass} ${rowClass}`}>
                ÁSZF{' '}
                <span aria-hidden="true" className="text-[#c8b68d]">
                  →
                </span>
              </Link>
            </nav>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 border-t border-white/15 pt-4 text-center text-[11px] text-brand-cream/70 md:flex-row md:items-center md:justify-between md:pt-6 md:text-left">
          <Link
            href="/#tartalom"
            className="inline-flex min-h-11 items-center gap-3 text-[13px]"
          >
            Vissza az elejére <span aria-hidden="true">↑</span>
          </Link>
          {/* Desktopon a copyright kerül előre. */}
          <span className="md:order-first">
            © 2026 Karifoto · Szeretettel, Budapestről.
          </span>
        </div>
      </div>
    </footer>
  );
}
