'use client';

import { usePathname } from 'next/navigation';
import { useLayoutEffect } from 'react';

const STORAGE_KEY = 'theme';

/**
 * A sötét mód csak az adminban él. Kliensoldali navigációnál (pl. adminból
 * kilépve) a route-váltás nem futtatja újra a gyökér layout inline scriptjét,
 * ezért itt is el kell távolítani a `.dark` osztályt, különben a publikus
 * oldalakon ragadna.
 */
export function ThemeScope() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (!pathname.startsWith('/admin')) {
      document.documentElement.classList.remove('dark');
      return;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    const dark =
      stored === 'dark' ||
      (stored !== 'light' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  }, [pathname]);

  return null;
}
