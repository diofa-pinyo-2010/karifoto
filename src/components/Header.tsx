'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';

import { Popover } from '@base-ui/react/popover';

const nav = [
  { href: '#csomagok', label: 'Csomagok' },
  { href: '#diszletek', label: 'Díszletek' },
  { href: '#velemenyek', label: 'Vélemények' },
  { href: '#gyik', label: 'Gyakori kérdések' },
];

/**
 * 2026-os arculat. A fejléc `absolute`, nem `sticky`: a hero képére ül rá, és
 * görgetéskor elúszik vele. A folyamatosan elérhető mobil CTA szerepét a
 * `MobileBookingBar` veszi át.
 *
 * A mobilmenü Base UI `Popover`: a kívülre kattintás, az Escape, a
 * fókuszkezelés és a nyitó/záró animáció is belőle jön — a látványterv ezeket
 * kézzel, `useEffect`-ben kötötte be.
 *
 * A panel a fejléchez van horgonyozva (nem a hamburgerhez), így teljes
 * szélességben nyílik, ahogy a látványtervben.
 *
 * Horgonylinkre kattintva a fókusz NEM tér vissza a hamburgerre. A Base UI
 * bezáráskor `focus({ preventScroll: true })`-szal visszaadná a fókuszt, de az
 * Android Chrome nem ismeri a `preventScroll`-t, így a lap tetején ülő gomb
 * fókuszálása félúton visszarántotta az oldalt a tetejére. Escape-re és
 * kívülre kattintásra a visszaadás marad.
 */
export function Header() {
  const header = useRef<HTMLElement>(null);
  const navigated = useRef(false);
  const onNavigate = () => {
    navigated.current = true;
  };
  const finalFocus = () => {
    const returnFocus = !navigated.current;
    navigated.current = false;
    return returnFocus;
  };

  return (
    <header
      ref={header}
      className="absolute inset-x-0 top-0 z-30 border-b border-white/10 bg-[linear-gradient(#07191f66,transparent)] font-brand-sans text-brand-cream"
    >
      <a
        href="#tartalom"
        className="absolute -top-37.5 left-5 bg-brand-cream p-3 text-brand-ink focus:top-2.5 focus:z-100"
      >
        Ugrás a tartalomra
      </a>

      <div className="brand-shell flex min-h-20.5 items-center justify-between gap-5 lg:min-h-24">
        <Link href="/" aria-label="Karifoto – kezdőlap" className="shrink-0">
          <Image
            src="/images/karifoto-logo-krem.png"
            alt="Karifoto"
            width={353}
            height={146}
            priority
            className="h-7 w-auto lg:h-10"
          />
        </Link>

        <nav
          aria-label="Fő navigáció"
          className="hidden items-center gap-8 text-sm lg:flex"
        >
          {nav.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="relative py-4 font-semibold after:absolute after:bottom-2 after:left-0 after:h-px after:w-0 after:bg-brand-champagne after:transition-[width] after:duration-200 after:content-[''] hover:after:w-full"
            >
              {n.label}
            </a>
          ))}
        </nav>

        <a
          href="#foglalas"
          className="hidden min-h-11 items-center gap-5 rounded-md border border-white/50 px-5 text-sm transition-colors duration-200 hover:border-current hover:bg-[#b3c9c51a] sm:inline-flex"
        >
          Időpontotok <span aria-hidden="true">↗</span>
        </a>

        <Popover.Root>
          <Popover.Trigger
            aria-label="Menü"
            className="group -mr-2.5 size-12 lg:hidden"
          >
            <span className="mx-auto flex w-[25px] flex-col gap-[7px]">
              <span className="h-[1.5px] bg-brand-cream transition-transform duration-200 group-data-popup-open:translate-y-[4.25px] group-data-popup-open:rotate-45" />
              <span className="h-[1.5px] bg-brand-cream transition-transform duration-200 group-data-popup-open:-translate-y-[4.25px] group-data-popup-open:-rotate-45" />
            </span>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Positioner
              anchor={header}
              side="bottom"
              align="center"
              sideOffset={-6}
              className="z-40 lg:hidden"
            >
              <Popover.Popup
                finalFocus={finalFocus}
                className="w-[calc(100vw-1.5rem)] rounded-xl border border-white/15 bg-[#102c32fa] p-5 text-brand-cream shadow-2xl backdrop-blur-[16px] transition-[opacity,scale] duration-150 ease-out data-ending-style:scale-[.98] data-ending-style:opacity-0 data-starting-style:scale-[.98] data-starting-style:opacity-0"
              >
                <nav aria-label="Mobil navigáció" className="flex flex-col">
                  {[
                    ...nav,
                    { href: '#helyszin', label: 'Itt találsz minket' },
                  ].map((n) => (
                    <Popover.Close
                      key={n.href}
                      // Linkként renderel, nem gombként — a Base UI alapból
                      // natív <button>-t vár, ezt kell kikapcsolni.
                      nativeButton={false}
                      onClick={onNavigate}
                      className="flex min-h-13 items-center justify-between border-b border-white/10 text-sm"
                      render={
                        <a href={n.href}>
                          {n.label}
                          <span aria-hidden="true">↗</span>
                        </a>
                      }
                    />
                  ))}
                  <Popover.Close
                    nativeButton={false}
                    onClick={onNavigate}
                    className="mt-3 flex min-h-13 items-center justify-center gap-5 rounded-lg border border-transparent bg-brand-champagne px-6 py-3.5 text-sm font-semibold text-[#152b2e]"
                    render={
                      <a href="#foglalas">
                        Megnézem a szabad időpontokat{' '}
                        <span aria-hidden="true">→</span>
                      </a>
                    }
                  />
                </nav>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </header>
  );
}
