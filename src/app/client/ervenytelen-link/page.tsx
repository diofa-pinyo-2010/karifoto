import Link from 'next/link';

// Where the verify route sends a token it can't accept. A static segment, so
// Next matches it ahead of the sibling [clientProfileId] route — and a real
// clientProfileId is always a UUID, so the two can never collide.
export default function ClientPortalInvalidLinkPage() {
  return (
    <section className="mx-auto w-full max-w-180 px-6 pt-14 pb-20 text-center sm:px-10">
      <p className="brand-eyebrow">Ügyfélportál</p>

      <h1 className="font-display text-[clamp(30px,5vw,44px)] leading-[1.07] font-medium text-pretty">
        Ez a link nem működik
      </h1>
      <p className="mx-auto mt-5 max-w-125 text-[15px] leading-[1.85] text-pretty text-brand-muted">
        Lehet, hogy lejárt, vagy nem teljesen másolódott be a böngészőbe.
        Próbáljátok meg újra a visszaigazoló emailben lévő „Ügyfélportál”
        gombbal, vagy írjatok nekünk.
      </p>

      <Link
        href="/"
        className="mt-7 inline-flex min-h-13 items-center justify-center rounded-lg bg-brand-champagne px-6 py-3.5 text-sm font-semibold text-[#152b2e] transition-opacity hover:opacity-90"
      >
        Vissza a főoldalra
      </Link>
    </section>
  );
}
