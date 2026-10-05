'use client';

import { useBookingSelection } from '@/components/BookingSelectionProvider';
import { buildFeatures, buildSub, PACKAGES } from '@/lib/catalog';
import { PACKAGE_HIGHLIGHT_BADGE } from '@/lib/data';
import { cn, formatMoney } from '@/lib/utils';

export function Pricing() {
  const { packageKey, selectPackage } = useBookingSelection();

  return (
    <section
      id="csomagok"
      className="brand-section bg-brand-ink bg-[radial-gradient(ellipse_at_50%_0%,#34585766,transparent_65%)] text-brand-cream"
    >
      <div className="brand-shell mb-10 text-center">
        <div className="brand-eyebrow text-[#c9b692]">Csomagjaink</div>
        <h2 className="brand-heading mx-auto max-w-xl">
          Válaszd ki, majd foglalj időpontot
        </h2>
      </div>

      <div className="brand-shell grid gap-6 md:grid-cols-3">
        {Object.values(PACKAGES)
          .filter((p) => p.visibility === 'pricingTable')
          .map((pkg) => {
            const { features, footnotes } = buildFeatures(pkg);

            return (
              <div
                key={pkg.slug}
                className={cn(
                  'relative flex flex-col rounded-xl border p-6 pt-8 lg:p-8 lg:pt-10',
                  pkg.highlighted
                    ? 'border-[#c9aa77] bg-brand-cream text-[#19363a]'
                    : 'border-[#6a888066] bg-[#17383dc9]',
                )}
              >
                {pkg.highlighted && (
                  <div className="absolute -top-3 left-6 rounded-full bg-[#c9aa77] px-4 py-1 font-brand-sans text-[9px] font-semibold tracking-[.15em] text-[#19363a] uppercase">
                    {PACKAGE_HIGHLIGHT_BADGE}
                  </div>
                )}

                <div className="font-display text-4xl">{pkg.label}</div>
                <div className="mt-2 text-xs opacity-80">{buildSub(pkg)}</div>

                <div className="mt-7 font-display text-[42px] leading-tight">
                  <span>{formatMoney(pkg.basePriceInCents)}</span>
                </div>
                <div className="mt-1 mb-6 text-xs opacity-80">
                  +{formatMoney(pkg.studioPriceInCents)} stúdió bérlet
                </div>

                <ul className="mb-5 space-y-3 border-t border-[#80948a55] pt-6">
                  {features.map((feat) => (
                    <li
                      key={feat.text}
                      className={cn(
                        'flex gap-2.5 text-xs leading-6',
                        !feat.included && 'opacity-[.58]',
                      )}
                    >
                      <span
                        className={cn(
                          'shrink-0',
                          pkg.highlighted ? 'text-[#49746a]' : 'text-[#b9ceba]',
                        )}
                      >
                        {feat.included ? '✓' : '✕'}
                      </span>
                      <span>
                        {feat.text}
                        {feat.note && (
                          <span className="block text-[10px] opacity-80">
                            ({feat.note})
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto space-y-1 text-[9px] leading-5 opacity-70">
                  {footnotes.map((f) => (
                    <div key={f}>{f}</div>
                  ))}
                </div>

                <a
                  href="#foglalas"
                  onClick={() => selectPackage(pkg.slug)}
                  className={cn(
                    'mt-6 flex min-h-12 items-center justify-center rounded-lg border px-4 py-3 text-sm font-semibold transition-colors duration-200',
                    pkg.highlighted
                      ? 'border-brand-champagne bg-brand-champagne hover:border-[#ddbb8c] hover:bg-[#ddbb8c]'
                      : 'border-[#a4b8a477] hover:bg-[#b3c9c51a]',
                  )}
                >
                  {pkg.slug === packageKey ? 'Kiválasztva ✓' : 'Ezt választom'}
                </a>
              </div>
            );
          })}
      </div>
    </section>
  );
}
