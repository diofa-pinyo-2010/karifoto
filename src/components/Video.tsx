'use client';

import ReactPlayer from 'react-player';

import { VIDEO_URL } from '@/lib/constants';

function VideoPlayIcon() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3.5 bg-[linear-gradient(180deg,rgba(14,38,32,.25),rgba(14,38,32,.6))]">
      <div className="flex h-15.5 w-15.5 items-center justify-center rounded-full bg-terracotta shadow-[0_16px_40px_rgba(184,80,58,.45)] sm:h-21 sm:w-21">
        <span className="ml-1.5 block h-0 w-0 border-y-13 border-l-20 border-y-transparent border-l-[#FFF4E6]" />
      </div>
      <span className="text-[13px] tracking-[.16em] text-[#EADFC9] uppercase">
        Videó · 0:34
      </span>
    </div>
  );
}

export function Video() {
  return (
    <section
      id="video"
      className="bg-cream px-4.5 py-13 text-ink sm:px-7 sm:py-22"
    >
      <div className="mx-auto max-w-250 text-center">
        <div className="text-[11px] tracking-label text-[#7B8C80] uppercase">
          Vendégeink mesélik
        </div>
        <h2 className="mt-3.5 font-display text-[31px] font-medium text-balance text-ink sm:text-[50px]">
          Milyen élmény nálunk a karácsonyi fotózás?
        </h2>
        <p className="mx-auto mt-3.5 max-w-140 text-base leading-[1.6] font-light text-pretty text-cream-muted sm:text-[18px]">
          Feltettünk pár kérdést vendégeinknek, lesd meg, milyen válaszokat
          kaptunk.
        </p>

        <div className="relative mx-auto mt-6.5 aspect-9/16 max-w-95 overflow-hidden rounded-[18px] border border-ink/18 bg-panel shadow-[0_24px_60px_rgba(20,51,42,.18)] sm:mt-10 sm:rounded-3xl">
          <ReactPlayer
            src={VIDEO_URL}
            // light="/images/hofeher-fo.jpg"
            playIcon={<VideoPlayIcon />}
            controls
            width="100%"
            height="100%"
          />
        </div>

        <a
          href="#foglalas"
          className="btn-cta mt-6 px-6.5 py-4.5 text-base shadow-[0_14px_32px_rgba(184,80,58,.28)] sm:mt-8.5 sm:px-10"
        >
          Én is szeretnék ilyen élményt →
        </a>
      </div>
    </section>
  );
}
