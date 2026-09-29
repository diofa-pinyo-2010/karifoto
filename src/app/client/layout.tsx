import Image from 'next/image';
import Link from 'next/link';

import { Footer } from '@/components/Footer';

// 2026-os arculat. A keret a jogi oldalakét követi (`LegalPage`), nem a
// landingét: ott a fejléc `absolute`, mert a hero képére ül rá — itt nincs hero,
// tehát tömör sávra van szükség.
//
// Layoutban és nem oldalanként, hogy a fejléc navigáláskor a helyén maradjon.
export default function ClientPortalLayout({
  children,
}: LayoutProps<'/client'>) {
  return (
    <div className="flex min-h-screen flex-col bg-brand-cream font-brand-sans text-brand-ink">
      <header className="bg-[#102a31] py-4.5 text-brand-cream">
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

      <main id="tartalom" className="flex-1">
        {children}
      </main>

      {/* Az ügyfélportálon nincs MobileBookingBar, tehát nem kell neki helyet hagyni. */}
      <Footer reserveBookingBarSpace={false} />
    </div>
  );
}
