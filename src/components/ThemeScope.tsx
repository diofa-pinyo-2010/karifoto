'use client';

import { usePathname } from 'next/navigation';
import { useLayoutEffect } from 'react';

const STORAGE_KEY = 'theme';

/**
 * A sötét mód csak az adminban él. Kliensoldali navigációnál (pl. adminból
 * kilépve) a route-váltás nem futtatja újra a gyökér layout inline scriptjét,
 * ezért itt is el kell távolítani a `.dark` osztályt, különben a publikus
 * oldalakon ragadna. Ugyanígy kapcsoljuk az `admin` osztályt (rendszerfontok).
 *
 * A rendszertéma változására is itt iratkozunk fel, nem a `ThemeToggle`-ben: az
 * csak az `admin/(protected)` layoutban van kirenderelve, így az azon kívüli
 * admin oldalak (pl. `/admin/login`) csak újratöltéskor követték a rendszer
 * beállítását. A `ThemeScope` a gyökér layoutban van, tehát mindenhol fut.
 */
export function ThemeScope() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const isAdmin = pathname.startsWith('/admin');
    document.documentElement.classList.toggle('admin', isAdmin);
    if (!isAdmin) {
      document.documentElement.classList.remove('dark');
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    // A tárolt választás mindig erősebb a rendszerbeállításnál, ezért minden
    // alkalommal újraolvassuk: explicit `light`/`dark` esetén a rendszer
    // váltása nem csinál semmit.
    const apply = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      const dark = stored === 'dark' || (stored !== 'light' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
    };

    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [pathname]);

  return null;
}
