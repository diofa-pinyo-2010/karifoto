import Link from 'next/link';

/**
 * Zsákutca-állapot a foglalási folyamatban: lejárt/elkelt időpont vagy érvénytelen
 * foglalás. A `title` oldalanként más, a többi mindenhol ugyanaz.
 */
export function BookingUnavailable({ title }: { title: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-130 px-4.5 pt-14 pb-10 text-center sm:px-10">
      <div className="eyebrow-ink">Foglalás</div>
      <h1 className="mt-3.5 font-display text-[30px] leading-[1.1] font-medium text-pretty text-ink sm:text-[38px]">
        {title}
      </h1>
      <p className="mx-auto mt-3.5 max-w-100 text-base leading-[1.6] font-light text-pretty text-cream-muted">
        Válassz másik időpontot a főoldalon.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-full bg-terracotta px-6 py-3.5 text-base font-medium text-[#FFF4E6] transition-colors hover:bg-terracotta-hover"
      >
        Vissza a főoldalra
      </Link>
    </section>
  );
}
