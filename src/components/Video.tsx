'use client';

import Image from 'next/image';
import { useState } from 'react';

import { VIDEO_EMBED_URL } from '@/lib/constants';
import poster from '@/photos/video-poster.jpg';

/**
 * 2026-os arculat. A YouTube-iframe csak kattintásra kerül a DOM-ba: addig a
 * videó saját borítóképe áll a helyén, helyben kiszolgálva — így az oldal
 * betöltése nem létesít kapcsolatot a Google-lel, és nem kell `react-player`
 * sem. A vezérlőket lejátszás után a YouTube adja.
 *
 * A borító a Shorts eredeti, álló képkockája (`oardefault`), ezért a keret is
 * 9:16 — így sem a kép, sem a lejátszó nem vágódik. A képbe égetett felirat a
 * kép alján ül, ezért ide nem teszünk saját alsó feliratot.
 */
export function Video() {
  const [playing, setPlaying] = useState(false);

  return (
    <section id="video" className="brand-section bg-[#ede8de]">
      <div className="brand-shell grid items-center gap-10 md:grid-cols-[1.2fr_1fr] md:gap-20">
        <div>
          <p className="brand-eyebrow">Vendégeink mesélik</p>
          <h2 className="brand-heading">
            Egy kis betekintés.
            <br />
            <em>Egy csomó mosoly.</em>
          </h2>
          <p className="brand-intro">
            Milyen élmény nálunk a karácsonyi fotózás? Feltettünk pár kérdést
            vendégeinknek, lesd meg, milyen válaszokat kaptunk.
          </p>
          <a
            href="#foglalas"
            // Mobilon teljes szélesség — a látványterv a hero CTA-inál is ezt
            // csinálja (`w-full sm:w-auto`), és így nagyobb a koppintási felület.
            className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-5 rounded-lg border border-[#85928b70] px-5 py-3 text-sm font-semibold transition-[background-color,border-color] duration-200 hover:border-current hover:bg-[#b3c9c51a] sm:w-auto"
          >
            Én is szeretnék ilyen élményt <span aria-hidden="true">→</span>
          </a>
        </div>

        <div className="relative mx-auto aspect-[9/16] w-full max-w-[340px] overflow-hidden rounded-xl border border-[#c5cbbc] bg-brand-night">
          {playing ? (
            <iframe
              src={VIDEO_EMBED_URL}
              title="Vendégeink mesélik – Karifoto"
              allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          ) : (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              aria-label="Vendégeink mesélik – videó lejátszása"
              className="group absolute inset-0 block cursor-pointer"
            >
              <Image
                src={poster}
                alt=""
                fill
                sizes="340px"
                placeholder="blur"
                className="object-cover"
              />
              <span className="absolute inset-0 bg-brand-night/25 transition-colors group-hover:bg-brand-night/10" />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex size-18 items-center justify-center rounded-full bg-brand-champagne pl-1 text-2xl text-[#152b2e] shadow-[0_8px_28px_#0b202859] transition-transform duration-200 group-hover:scale-105">
                  ▶
                </span>
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
