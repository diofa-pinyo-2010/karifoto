import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion';

import { faqs } from '@/lib/faq';

/**
 * 2026-os arculat. A szekció opt-in módon vált a márkapalettára és a Manrope-ra
 * (`font-brand-sans`), amíg a többi szekció még a régi sötétzöld arculatot
 * viseli.
 *
 * Közvetlenül a Base UI primitívjét használjuk, nem a `@/components/ui/accordion`
 * wrappert. Az a fájl a shadcn admin design systeméhez van stílusozva (chevron
 * ikonok, `ring` és `muted-foreground` tokenek), így a márkás megjelenéshez
 * végig felül kellene írni — ráadásul a `shadcn apply` (a `--only theme`
 * kapcsoló nélkül) újragenerálja a `components/ui/` fájlokat, és a wrapper
 * belső horgonyaira (`data-slot`, `group/...` nevek) épülő felülírások némán
 * elromlanának.
 *
 * Egyszerre egy panel nyílik (a `multiple` alapértelmezésben false), az első
 * kérdés nyitva indul, a magasságanimáció a `--accordion-panel-height`
 * változóra épül. A Base UI saját `'use client'`-tel jön, így ez a komponens
 * szerver oldali marad.
 */
export function Faq() {
  return (
    <section id="gyik" className="brand-section bg-[#e8eee8]">
      <div className="brand-shell grid gap-9 sm:px-10 lg:grid-cols-[.85fr_1.15fr] lg:gap-20 lg:px-12">
        <div>
          <p className="brand-eyebrow">Mielőtt útnak indultok</p>
          <h2 className="brand-heading">Gyakori kérdések</h2>
          <p className="brand-intro">
            Sok kérdés felmerült az elmúlt években, amiket igyekeztünk mind
            megválaszolni:
          </p>
          {/* <a
            href="mailto:info@karifoto.hu"
            className="mt-5 inline-flex min-h-11 items-center border-b border-[#9eaba3] text-xs"
          >
            Más kérdésed van? Írj nekünk ↗
          </a> */}
        </div>

        <AccordionPrimitive.Root defaultValue={[faqs[0].q]}>
          {faqs.map((f) => (
            <AccordionPrimitive.Item
              key={f.q}
              value={f.q}
              className="border-b border-brand-ink/20"
            >
              <AccordionPrimitive.Header>
                <AccordionPrimitive.Trigger className="group flex min-h-17 w-full items-center justify-between gap-4 py-5 text-left text-sm font-semibold select-none focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ad7135]">
                  {f.q}
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-xl leading-none font-normal text-[#62786f] transition-transform duration-200 ease-out group-data-panel-open:rotate-45"
                  >
                    +
                  </span>
                </AccordionPrimitive.Trigger>
              </AccordionPrimitive.Header>
              <AccordionPrimitive.Panel className="h-[var(--accordion-panel-height)] overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0">
                <div className="space-y-3 pb-6 text-sm leading-7 text-brand-muted [&_strong]:font-semibold [&_strong]:text-brand-ink [&_ul]:list-disc [&_ul]:pl-5">
                  {f.a}
                </div>
              </AccordionPrimitive.Panel>
            </AccordionPrimitive.Item>
          ))}
        </AccordionPrimitive.Root>
      </div>

      <div className="brand-shell mt-12 flex flex-col items-center justify-center gap-5 border-t border-brand-ink/15 pt-10 text-center sm:flex-row sm:gap-9">
        <p className="font-display text-3xl">A többi már a ti történetetek.</p>
        <a
          href="#foglalas"
          className="inline-flex min-h-13 items-center justify-center gap-5 rounded-lg border border-transparent bg-brand-champagne px-6 py-3.5 text-sm font-semibold text-[#152b2e] transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-px hover:bg-[#e3bf8d] hover:shadow-[0_5px_22px_#00000015]"
        >
          Foglalok időpontot
          <span aria-hidden="true" className="text-[22px] leading-none">
            →
          </span>
        </a>
      </div>
    </section>
  );
}
