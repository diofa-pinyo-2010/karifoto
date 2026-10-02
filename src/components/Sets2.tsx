'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

import { ArrowRightIcon, ShirtIcon } from 'lucide-react';

import { useBookingSelection } from '@/components/BookingSelectionProvider';
import { PhotoGallery } from '@/components/PhotoGallery';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardFooter } from '@/components/ui/card';
import { MOBILE_BREAKPOINT } from '@/hooks/use-mobile';
import { DecorSetSection, decorSetSections } from '@/lib/data';
import { cn } from '@/lib/utils';

import { Button } from './ui/button';

export function Sets2() {
  const decorSets = decorSetSections.filter((ds) => !ds.isExtra);
  const extras = decorSetSections.filter((s) => s.isExtra);
  const { light, toggleLight } = useBookingSelection();

  return (
    <section
      id="diszletek"
      className="scroll-mt-10 bg-brand-cream font-brand-sans text-brand-ink"
    >
      <div className="brand-shell py-4">
        <div className="flex flex-col gap-10 lg:gap-12">
          <div className="text-center">
            <p className="brand-eyebrow">Díszleteink</p>
            <h2 className="brand-heading">
              Két mesés világ, ahol
              <br />
              <em>Ti vagytok a középpontban.</em>
            </h2>
          </div>
          <nav
            aria-label="Díszletek"
            className="grid grid-cols-2 gap-3 lg:mx-auto lg:max-w-3xl"
          >
            {decorSets.map(({ id, name, mainImage }) => (
              <a key={id} href={`#${id}`}>
                <Card className="shadow">
                  <Image src={mainImage} alt={mainImage.alt} />
                  <CardFooter className="p-3 lg:p-(--card-spacing)">
                    <Button
                      size="lg"
                      className="group w-full tracking-wide uppercase lg:text-lg"
                      variant="outline"
                    >
                      {name}
                      <ArrowRightIcon className="hidden transition-transform group-hover:translate-x-1 lg:block" />
                    </Button>
                  </CardFooter>
                </Card>
              </a>
            ))}
          </nav>
          <p className="text-base text-brand-muted lg:mx-auto lg:max-w-2xl lg:text-xl">
            2026-ban is két csodálatos díszlettel várunk benneteket. Winter
            wonderland, vagy cosy cocooning a kandalló melegénél? Nézzétek meg
            korábbi képeinket, és találjátok meg a hozzátok illőt.
          </p>
          <ChristmasSeparator />
          <div>
            {decorSets.map((set) => {
              return (
                <SetSection
                  key={set.id}

                  {...set}
                />
              );
            })}
          </div>
          <div>
            {extras.map(
              ({ id, name, tagline, description, mainImage, gallery }) => {
                return (
                  <section
                    key={id}
                    id={id}
                    className="grid gap-6 rounded-md border border-[#d5c5ab] bg-[#ece5d9] p-5 sm:p-8 lg:grid-cols-2 lg:gap-x-16"
                  >
                    <div className="flex flex-col gap-2 lg:gap-3 lg:self-end">
                      <p className="text-brand-muted uppercase">{tagline}</p>
                      <h2 className="font-display text-4xl font-bold lg:text-6xl">
                        {name}
                      </h2>
                      <p className="text-brand-muted">{description}</p>
                    </div>
                    <Image
                      src={mainImage}
                      alt={mainImage.alt}
                      className="rounded-lg ring-1 ring-black/10 lg:col-start-2 lg:row-span-2 lg:row-start-1"
                    />
                    <p className="text-brand-muted">
                      A{' '}
                      <a
                        href="#csomagok"
                        className="text-brand-night underline underline-offset-2 hover:text-brand-muted"
                      >
                        Family csomag
                      </a>{' '}
                      alapból tartalmazza, de bármelyik másik csomaghoz is külön
                      kérhető az{' '}
                      <a
                        href="#foglalas"
                        className="text-brand-night underline underline-offset-2 hover:text-brand-muted"
                      >
                        időpontfoglalás
                      </a>{' '}
                      során.
                    </p>
                    <a
                      href="#foglalas"
                      onClick={() => {
                        if (!light) toggleLight();
                      }}
                      // className="rounded-md border border-brand-champagne bg-brand-champagne/20 hover:bg-brand-champagne/40 transition-colors  px-6 py-3 text-center font-bold text-brand-ink/80 uppercase lg:self-start"
                      className="my-4 flex h-12 items-center justify-center rounded-lg border border-brand-champagne px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-champagne/40 lg:my-0"
                    >
                      {light ? 'Kiválasztva ✓' : 'Tedd ezt is a kosárba →'}
                    </a>
                    <PhotoGallery photos={gallery} targetRowHeight={120} />
                  </section>
                );
              },
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ChristmasSeparator({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 24"
      aria-hidden="true"
      // className="mx-auto my-12 w-full max-w-sm text-[#c8a97e]"
      className={cn('mx-auto w-full max-w-sm text-[#c8a97e]', className)}
      fill="currentColor"
    >
      <g stroke="currentColor" strokeWidth="1">
        <line x1="0" y1="12" x2="168" y2="12" />
        <line x1="232" y1="12" x2="400" y2="12" />
      </g>
      <path d="M200 2Q201.5 10.5 210 12Q201.5 13.5 200 22Q198.5 13.5 190 12Q198.5 10.5 200 2Z" />
      <path d="M180 9.5L182.5 12L180 14.5L177.5 12Z" />
      <path d="M220 9.5L222.5 12L220 14.5L217.5 12Z" />
    </svg>
  );
}

function SetSection({
  id,
  tagline,
  name,
  description,
  mainImage,
  colors,
  gallery,
  tips,
  setKey,
}: DecorSetSection) {
  const [openTips, setOpenTips] = useState<string[]>([]);
  const { decorKey, selectDecorSet } = useBookingSelection();

  const selected = decorKey === setKey;

  useEffect(() => {
    if (window.innerWidth >= MOBILE_BREAKPOINT) setOpenTips(['tip']);
  }, []);

  return (
    <section id={id} className="flex scroll-mt-8 flex-col gap-12">
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-x-16">
        <div className="flex flex-col gap-2 lg:gap-3 lg:self-end">
          <p className="text-brand-muted uppercase">{tagline}</p>
          <h2 className="font-display text-4xl font-bold lg:text-6xl">
            {name}
          </h2>
          <p className="text-brand-muted">{description}</p>
        </div>

        <Image
          src={mainImage}
          alt={mainImage.alt}
          className="rounded-lg ring-1 ring-black/10 lg:col-start-2 lg:row-span-2 lg:row-start-1"
        />

        <div className="flex flex-col gap-6 lg:gap-8 lg:self-start">
          {colors != null && (
            <div className="flex flex-col gap-2">
              <p className="text-sm">Uralkodó színek</p>
              <div className="flex flex-wrap items-center gap-2">
                {colors.map((c) => (
                  <span
                    key={c.name}
                    className="flex items-center gap-2 rounded-full border bg-white/70 py-1.5 pr-3 pl-2 text-sm"
                  >
                    <i
                      className="block size-3 rounded-full border border-black/10"
                      style={{ background: c.hex }}
                    />
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          <a
            href="#foglalas"
            onClick={() => {
              if (setKey != null) {
                selectDecorSet(setKey);
              }
            }}
            className="rounded-md bg-brand-champagne px-6 py-3 text-center font-bold text-brand-ink/80 uppercase lg:self-start"
          >
            {selected ? 'Kiválasztva ✓' : 'Ezt szeretném →'}
          </a>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr_3fr] lg:items-start lg:gap-x-16">
        <div className="flex min-w-0 flex-col gap-4">
          <h3 className="text-lg font-bold text-brand-muted">
            Képek ebben a díszletben
          </h3>
          <PhotoGallery photos={gallery} />
        </div>
        <Accordion
          value={openTips}
          onValueChange={setOpenTips}
          className="rounded-md border border-brand-taken-edge bg-brand-champagne/10 px-2 lg:order-first lg:mt-11"
        >
          <AccordionItem value="tip">
            <AccordionTrigger className="flex items-center gap-2 text-sm font-medium text-brand-muted">
              <ShirtIcon className="size-4 text-brand-champagne" />
              Öltözködési tippek: {name}
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm leading-relaxed text-brand-muted">{tips}</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
      <ChristmasSeparator className="mb-10 lg:mb-20" />
    </section>
  );
}
