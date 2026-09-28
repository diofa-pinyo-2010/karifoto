'use client';

import { Collapsible } from '@base-ui/react/collapsible';

import { useBookingSelection } from '@/components/BookingSelectionProvider';
import { PhotoGallery } from '@/components/PhotoGallery';
import { photoSets } from '@/lib/data';
import { cn } from '@/lib/utils';

/**
 * 2026-os arculat. A díszletek egyetlen szekcióba kerültek: fejléc, két
 * díszlet-fül, majd díszletenként egy kétoszlopos blokk (szöveg + galéria).
 * Korábban minden díszlet külön, teljes szélességű szekció volt saját
 * háttérrel.
 *
 * A Fényjáték nem díszlet, hanem extra (`extra: true`, `key: null`), ezért a
 * fülek közül kimarad, és a két díszlet után önálló, keretes kártyaként ül.
 */
export function Sets() {
  const decorSets = photoSets.filter((s) => !s.extra);
  const extras = photoSets.filter((s) => s.extra);

  return (
    <section
      id="diszletek"
      className="brand-section bg-brand-cream bg-[radial-gradient(ellipse_at_50%_0%,#dac5a426,transparent_65%)]"
    >
      <div className="brand-shell">
        <div className="mb-9 flex flex-col gap-6 md:mb-12 md:flex-row md:items-end md:justify-between md:gap-12">
          <div>
            <p className="brand-eyebrow">A történetetek díszlete</p>
            <h2 className="brand-heading">
              Két mesés világ.
              <br />
              <em>Ti vagytok a középpontban.</em>
            </h2>
          </div>
          <p className="brand-intro max-w-sm">
            Havas ragyogás vagy meghitt kastélyhangulat? Ismerjétek meg a
            díszleteket, és találjátok meg a hozzátok illőt.
          </p>
        </div>

        <nav
          aria-label="Díszletek"
          className="mb-4 grid grid-cols-1 border-y border-[#d5cdbf] sm:grid-cols-2"
        >
          {decorSets.map((s, i) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex min-h-14 items-center gap-3 border-b border-[#d5cdbf] px-1 py-3 font-display text-2xl transition-colors last:border-b-0 hover:bg-[#dac5a426] sm:border-r sm:border-b-0 sm:px-4 sm:last:border-r-0"
            >
              <span className="font-brand-sans text-[10px] text-[#6e8277]">
                0{i + 1}
              </span>
              {s.name}
              <span aria-hidden="true" className="ml-auto text-xl">
                ↘
              </span>
            </a>
          ))}
        </nav>

        <p className="mb-10 text-xs leading-6 text-brand-muted">
          Még egy kis varázslat a díszletekben:{' '}
          <a
            href="#diszlet-fenyjatek"
            className="inline-flex min-h-11 items-center gap-2 font-semibold text-brand-ink underline underline-offset-4"
          >
            Fényjáték extra <span aria-hidden="true">↘</span>
          </a>
        </p>

        {decorSets.map((s, i) => (
          <SetSection key={s.id} set={s} number={i + 1} />
        ))}
        {extras.map((s) => (
          <SetSection key={s.id} set={s} />
        ))}
      </div>
    </section>
  );
}

function SetCta({ set }: { set: (typeof photoSets)[number] }) {
  const { decorKey, light, selectDecorSet, toggleLight } =
    useBookingSelection();
  // A Fényjáték nem díszlet, hanem extra → külön kapcsolóként viselkedik.
  const selected = set.extra ? light : decorKey === set.key;

  return (
    <a
      href="#foglalas"
      onClick={() => {
        if (set.extra) {
          if (!light) toggleLight();
        } else if (set.key != null) {
          selectDecorSet(set.key);
        }
      }}
      className="mt-5 inline-flex min-h-12 items-center justify-center gap-5 rounded-lg border border-[#85928b70] px-5 py-3 text-sm font-semibold transition-[background-color,border-color] duration-200 hover:border-current hover:bg-[#b3c9c51a]"
    >
      {selected
        ? 'Kiválasztva ✓'
        : set.extra
          ? 'Ezt is kérem →'
          : 'Ezt szeretném →'}
    </a>
  );
}

function SetSection({
  set,
  number,
}: {
  set: (typeof photoSets)[number];
  number?: number;
}) {
  // A látványterv `lg`-től felcseréli a második díszlet oszlopait (galéria
  // balra), hogy a két blokk ne ugyanúgy nézzen ki egymás alatt.
  const flipped = number === 2;

  return (
    <section
      id={set.id}
      className={cn(
        'grid gap-6 md:grid-cols-2 md:items-center md:gap-x-14',
        set.extra
          ? // Önálló kártya: saját kerete és belső margója van. A lenti
            // elválasztó-szabályok (`last:border-b-0`, `last:pb-0`) nem
            // kerülhetnek rá — a kártya mindig utolsó elem, és azok pont az ő
            // alsó keretét és belső margóját nulláznák le.
            'mt-10 rounded-2xl border border-[#d5c5ab] bg-[#ece5d9] p-5 sm:p-8 md:mt-14 md:p-10'
          : 'border-b border-[#c9bfab] py-14 last:border-b-0 last:pb-0 first-of-type:pt-0 md:py-20',
      )}
    >
      <div className={cn(flipped && 'lg:order-2')}>
        <p className="brand-eyebrow">
          {!set.extra && <span className="mr-3 text-xs">0{number}</span>}
          {set.extra
            ? 'Kiegészítő szolgáltatás · a díszletekben'
            : 'Karácsonyi díszlet'}
        </p>
        <h3 className="mb-4 font-display text-5xl font-medium text-balance md:text-6xl">
          {set.name}
        </h3>
        <p className="max-w-md text-sm leading-7 text-[#536964]">{set.desc}</p>

        {set.colors != null && (
          <div
            aria-label="Uralkodó színek"
            className="my-5 flex flex-wrap gap-4 text-[10px] text-[#526561]"
          >
            {set.colors.map((c) => (
              <span key={c.name} className="flex items-center gap-2">
                <i
                  className="block size-3 rounded-full border border-black/10"
                  style={{ background: c.hex }}
                />
                {c.name}
              </span>
            ))}
          </div>
        )}

        {set.extra && (
          <p className="mt-4 max-w-md text-sm leading-7 text-[#536964]">
            A{' '}
            <strong className="font-semibold">Family csomag tartalmazza</strong>
            , vagy külön kérhető a foglalás során.
          </p>
        )}

        <SetCta set={set} />
      </div>

      {/* `min-w-0`: rácselem alapból nem mehet a tartalma alá, enélkül a
          galéria kinyomná az oszlopot. */}
      <div className={cn('min-w-0', flipped && 'lg:order-1')}>
        {/*
          A két díszlet galériájában van egy-egy álló kép, ezért a
          `RowsPhotoAlbum` az álló + fekvő párokból ki tudja hozni a 370-es
          sormagasságot, és soronként két kép kerül egymás mellé.

          A Fényjáték galériája viszont csupa fekvő (1,38–1,62): egy kép a
          félszéles oszlopban épp ~336 magas, ami közelebb van a 370-hez, mint
          bármely kétképes megoldás — így mind a hat kép külön sorba kerülne, és
          a galériaoszlop háromszor olyan magas lenne, mint a szöveg melletti.
          Alacsonyabb célmagassággal itt is két kép kerül egy sorba, ahogy a
          látványterv fix kétoszlopos rácsában is volt.
        */}
        <PhotoGallery
          photos={set.gallery}
          // targetRowHeight={set.extra ? 175 : 370}
          targetRowHeight={set.extra ? 175 : 240}
        />
      </div>

      <Collapsible.Root
        className={cn(
          'border-t border-[#dde0d6] pt-4 md:col-span-2',
          flipped && 'lg:order-3',
        )}
      >
        <Collapsible.Trigger className="group flex min-h-11 w-full flex-wrap items-center justify-between gap-2 text-left text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ad7135]">
          Mi mutat jól a képeken?
          <span className="flex items-center gap-5 text-[10px] text-[#5f756d]">
            Öltözködési tippek
            <span
              aria-hidden="true"
              className="text-base transition-transform duration-200 ease-out group-data-panel-open:rotate-45"
            >
              +
            </span>
          </span>
        </Collapsible.Trigger>
        <Collapsible.Panel className="h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0">
          <p className="max-w-3xl py-4 text-sm leading-7 text-brand-muted">
            {set.tips}
          </p>
        </Collapsible.Panel>
      </Collapsible.Root>
    </section>
  );
}
