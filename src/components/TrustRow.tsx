import { stats } from '@/lib/data';

export function TrustRow() {
  return (
    <section className="mx-auto grid max-w-300 grid-cols-1 gap-3 px-4.5 pt-10 pb-5 sm:grid-cols-2 sm:px-7 lg:grid-cols-4 lg:pt-16">
      {stats.map((s) => (
        <div
          key={s.value}
          className="rounded-[18px] border border-cream/9 bg-panel px-5.5 py-6.5"
        >
          <div className="font-display text-[34px] text-gold">{s.value}</div>
          <div className="mt-2 text-sm leading-normal text-sage-soft">
            {s.label}
          </div>
        </div>
      ))}
    </section>
  );
}
