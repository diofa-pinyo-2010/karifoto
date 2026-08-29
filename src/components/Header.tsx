import Link from 'next/link';

import { Wordmark } from '@/components/Wordmark';

const nav = [
  { href: '#csomagok', label: 'Csomagok' },
  { href: '#diszletek', label: 'Díszletek' },
  { href: '#velemenyek', label: 'Vélemények' },
  { href: '#gyik', label: 'GYIK' },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-cream/10 bg-forest/86 backdrop-blur-lg">
      <div className="mx-auto flex max-w-300 items-center gap-3 px-4 py-3 sm:gap-8 sm:px-7">
        <Link
          href="/"
          className="mr-auto text-cream transition-opacity hover:opacity-85"
        >
          <Wordmark size={22} className="sm:hidden" />
          <Wordmark size={26} className="hidden sm:flex" />
        </Link>

        <nav className="hidden gap-6 text-sm text-[#C9D6CE] md:flex">
          {nav.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="transition-colors hover:text-cream"
            >
              {n.label}
            </a>
          ))}
        </nav>

        <a
          href="#foglalas"
          className="btn-cta px-4.5 py-2.75 text-[13px] whitespace-nowrap shadow-cta-sm sm:px-6 sm:py-3.25 sm:text-sm"
        >
          Időpontot választok
        </a>
      </div>
    </header>
  );
}
