'use client';

import { useBooking } from '@/components/BookingProvider';
import { packages } from '@/lib/data';

export function Pricing() {
  const { pkgIndex, selectPackage } = useBooking();

  return (
    <section
      id="csomagok"
      className="mx-auto max-w-300 px-4.5 py-13 sm:px-7 sm:py-20"
    >
      <div className="mb-7 text-center sm:mb-11.5">
        <div className="eyebrow">Csomagok</div>
        <h2 className="mt-3.5 font-display text-[31px] font-medium text-cream-strong sm:text-[50px]">
          Válaszd ki, majd foglalj időpontot
        </h2>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-3">
        {packages.map((p, i) => {
          const active = i === pkgIndex;
          return (
            <div
              key={p.id}
              className={`relative flex h-full flex-col rounded-3xl border px-7 pt-8 pb-7 transition-colors ${
                active
                  ? 'border-gold/55 bg-panel-active'
                  : 'border-cream/9 bg-panel'
              }`}
            >
              {p.badge && (
                <div className="absolute top-4.5 right-4.5 rounded-full bg-terracotta px-3.5 py-1.75 text-[10px] tracking-[.2em] text-[#FFF4E6] uppercase">
                  {p.badge}
                </div>
              )}

              <div className="font-display text-[30px] text-cream-strong">
                {p.name}
              </div>
              <div className="mt-1.5 text-sm text-sage">{p.sub}</div>

              <div className="mt-5.5 flex items-baseline gap-2">
                <span className="font-display text-[46px] text-gold">
                  {p.price}
                </span>
              </div>
              <div className="mt-1.5 text-[13px] text-sage">{p.studioFee}</div>

              <ul className="mt-6 flex flex-col gap-3 border-t border-cream/12 pt-6">
                {p.features.map((feat) => (
                  <li
                    key={feat.text}
                    className={`flex gap-2.75 text-[15px] leading-[1.45] ${
                      feat.ok ? 'text-[#C6D5CB]' : 'text-sage-dim'
                    }`}
                  >
                    <span className={feat.ok ? 'text-gold' : 'text-terracotta'}>
                      {feat.ok ? '✓' : '✕'}
                    </span>
                    <span>
                      {feat.text}
                      {feat.note && (
                        <span className="block text-[12.5px] text-sage">
                          ({feat.note})
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 mb-6.5 flex flex-col gap-1 text-[12px] leading-[1.4] text-sage-dim">
                {p.footnotes.map((f) => (
                  <div key={f}>{f}</div>
                ))}
              </div>

              <a
                href="#foglalas"
                onClick={() => selectPackage(i)}
                className={`mt-auto block rounded-full border px-5 py-4 text-center text-[15px] font-medium transition-opacity hover:opacity-90 ${
                  active
                    ? 'border-terracotta bg-terracotta text-[#FFF4E6]'
                    : 'border-gold/40 text-gold'
                }`}
              >
                Ezt választom
              </a>
            </div>
          );
        })}
      </div>
    </section>
  );
}
