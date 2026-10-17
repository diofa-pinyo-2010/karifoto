'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion';

/**
 * A GYIK accordion gyökere, kontrollált `value`-val, hogy egy `#<slug>` hash
 * (pl. `/#faq-kisallat`) ki is nyissa a kérdést, ne csak odagörgessen. Csak ez a
 * réteg kliens oldali; az itemeket a szerver oldali `Faq` rendereli `children`
 * ként.
 *
 * A `hashchange` miatt az oldalon belüli `<a href="#faq-kisallat">` linkek is
 * működnek (pl. egy másik válaszból). Ismeretlen hash (pl. `#foglalas`) esetén
 * nem nyúlunk a nyitott panelhez. Visszafelé is szinkronban van: kattintásra a
 * hash a nyitott kérdés slugja lesz, bezáráskor eltűnik.
 */
export function FaqAccordionRoot({
  slugs,
  children,
}: {
  slugs: string[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState<string[]>([slugs[0]]);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const openFromHash = () => {
      const slug = decodeURIComponent(window.location.hash.slice(1));
      if (!slugs.includes(slug)) return;
      setOpen([slug]);
      // A korábban nyitott panel csukódása (200 ms magasság-transition)
      // felfelé tolja a célt, a `scroll-smooth` görgetés viszont az indításkori
      // pozícióra tart — ezért megvárjuk az animációk végét, és csak utána
      // görgetünk. A dupla rAF azért kell, mert a Base UI a render utáni
      // frame-ben indítja a transitiont.
      requestAnimationFrame(() =>
        requestAnimationFrame(async () => {
          const animations =
            rootRef.current?.getAnimations({ subtree: true }) ?? [];
          await Promise.allSettled(animations.map((a) => a.finished));
          document.getElementById(slug)?.scrollIntoView({ block: 'start' });
        }),
      );
    };

    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return () => window.removeEventListener('hashchange', openFromHash);
  }, [slugs]);

  // A másik irány: kattintásra a URL hash a nyitott kérdést követi, hogy a
  // címsorból bármelyik kérdés linkje kimásolható legyen. `replaceState`, mert
  // az nem vált ki `hashchange`-et és nem görget, és nem tömi tele a history-t.
  // Bezáráskor csak a saját (FAQ) hash-ünket töröljük, egy `#foglalas`-t nem.
  const handleValueChange = (value: string[]) => {
    setOpen(value);
    const { pathname, search, hash } = window.location;
    const opened = value[0];
    if (opened) {
      history.replaceState(null, '', `${pathname}${search}#${opened}`);
    } else if (slugs.includes(decodeURIComponent(hash.slice(1)))) {
      history.replaceState(null, '', `${pathname}${search}`);
    }
  };

  return (
    <AccordionPrimitive.Root
      ref={rootRef}
      value={open}
      onValueChange={handleValueChange}
    >
      {children}
    </AccordionPrimitive.Root>
  );
}
