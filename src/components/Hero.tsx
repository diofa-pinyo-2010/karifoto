import Image from 'next/image';

import { Avatar } from '@base-ui/react/avatar';

import { RATING } from '@/lib/data';
import avatar1 from '@/photos/avatars/csalad-1.webp';
import avatar2 from '@/photos/avatars/csalad-2.webp';
import avatar3 from '@/photos/avatars/csalad-3.webp';
import avatar4 from '@/photos/avatars/csalad-4.webp';
import heroPhoto from '@/photos/hero-2026.webp';

/**
 * A „1700 lefotózott család” sor egymásra csúsztatott arcképei. Korábbi
 * fotózásokból kivágott portrék, 128px-es webp-ek — a `next/image` itt nem
 * hozna semmit, a fájl már a megjelenítési méret közelében van.
 */
const familyAvatars = [avatar1, avatar2, avatar3, avatar4];

/**
 * 2026-os arculat. A fejléc ráül a hero képére (`absolute`), ezért a szöveg
 * felső margóját a `clamp()` tartja a kép alatt.
 *
 * A kép egyetlen forrásból megy: a látványterv külön mobil fájlja ugyanaz a
 * kivágás volt kisebb méretben, a tényleges kivágáskülönbséget az
 * `object-position` adja breakpointonként. Így a `next/image` tud méretezni
 * (`srcset`), a `priority` pedig az LCP-kép miatt kell.
 */
export function Hero() {
  return (
    <section
      id="hero"
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden bg-[#0b1e26] font-brand-sans text-brand-cream"
    >
      <div className="absolute inset-x-0 top-0 -z-30 h-[540px] lg:inset-0 lg:h-full">
        <Image
          src={heroPhoto}
          alt="Egy meghitt családi pillanat a mesés karácsonyi kastélyban"
          fill
          priority
          // `lg` alatt a keret magassága fix 540px, a kép pedig `object-cover`
          // 16:9 — a ténylegesen megjelenített képszélesség így a viewporttól
          // függetlenül ~960px, nem 100vw. Egyszerű `100vw`-vel a Next egy
          // telefonszélességű (pl. 390px) változatot szolgálna ki, amit utána
          // 960px-re nagyítana: attól lett homályos.
          sizes="(max-width: 1023px) 960px, 100vw"
          placeholder="blur"
          className="object-cover object-[77%_50%] lg:object-[65%_center]"
        />
      </div>

      {/* A kép alját fokozatosan a szekció háttérszínébe olvasztja, hogy a
          szöveg mindenhol olvasható maradjon. */}
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(180deg,#07181c25_0%,transparent_210px,#0b1e2640_270px,#0b1e26c9_360px,#0b1e26_510px)] lg:bg-[linear-gradient(90deg,#071b23d9_0%,#071b23a3_32%,#071b2340_53%,transparent_75%),linear-gradient(0deg,#0a1f2877,transparent_40%)]" />

      <div className="brand-shell pt-[clamp(305px,83vw,390px)] pb-[66px] max-[359px]:pt-[285px] lg:flex lg:min-h-[780px] lg:items-center lg:pt-[185px] lg:pb-[120px] xl:min-h-[810px]">
        <div className="relative lg:w-[54%] xl:w-[55%]">
          <p className="mb-3 text-[9px] font-semibold tracking-[.19em] text-[#eee8dc] uppercase lg:mb-[22px] lg:text-[10px] lg:tracking-[.22em]">
            Karácsonyi fotózás Budapesten
          </p>

          <h1
            id="hero-title"
            className="max-w-[620px] font-display text-[clamp(2.5rem,10.6vw,3.5rem)] leading-[1.02] font-medium tracking-[-.025em] text-balance max-[359px]:text-[36px] lg:text-[clamp(3.3rem,5.25vw,4.6rem)]"
          >
            A karácsony, amire
            <br className="hidden xl:block" /> jó lesz{' '}
            <em className="not-italic">visszanézni.</em>
          </h1>

          <p className="mt-4 max-w-lg text-[13px] leading-[1.75] text-[#edece4] sm:text-base lg:mt-6 lg:max-w-[440px] lg:text-[15px]">
            Mesés díszletek, felszabadult pillanatok és képek, amelyek évek
            múlva is hazavisznek ebbe az érzésbe.
          </p>

          <p className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-[#bcd0cc] sm:text-xs lg:mt-[19px]">
            Saját budapesti stúdió <span aria-hidden="true">·</span> 2 mesés
            díszlet
          </p>

          <div className="mt-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-6 lg:mt-[30px] lg:flex-wrap lg:gap-[15px] xl:gap-[23px]">
            <a
              href="#foglalas"
              className="inline-flex min-h-13 w-full items-center justify-center gap-5 rounded-lg border border-transparent bg-brand-champagne px-6 py-3.5 text-sm font-semibold text-[#152b2e] transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-px hover:bg-[#e3bf8d] hover:shadow-[0_5px_22px_#00000015] sm:w-auto"
            >
              Időpontot foglalok <span aria-hidden="true">→</span>
            </a>
            <a
              href="#diszletek"
              className="flex min-h-11 items-center justify-center gap-3 text-xs underline-offset-[5px] hover:underline sm:text-sm lg:py-2 lg:text-xs"
            >
              Megnézem a díszleteket <span aria-hidden="true">↗</span>
            </a>
          </div>

          <div className="mt-4 flex flex-col gap-2.5 text-[11px] max-[359px]:text-[10px] sm:text-xs lg:mt-[27px]">
            <p className="flex items-center gap-1.5">
              {/* Dekoratív: a mondat maga hordozza a jelentést, ezért a
                  képsor a képernyőolvasónak rejtett. */}
              <span aria-hidden="true" className="mr-2 flex -space-x-2">
                {familyAvatars.map((photo) => (
                  <Avatar.Root
                    key={photo.src}
                    className="inline-flex size-7 overflow-hidden rounded-full bg-[#1b3239] ring-2 ring-[#f1ece1]/90 select-none"
                  >
                    <Avatar.Image
                      src={photo.src}
                      alt=""
                      width={28}
                      height={28}
                      className="size-full object-cover"
                    />
                    <Avatar.Fallback className="size-full bg-brand-champagne/30" />
                  </Avatar.Root>
                ))}
              </span>
              Több mint <strong className="font-semibold">1700</strong>{' '}
              lefotózott család
            </p>
            <a
              href="#velemenyek"
              aria-label={`${RATING.score} az 5-ből, ${RATING.count} Google-értékelés. Ugrás a véleményekhez.`}
              className="inline-flex min-h-8 w-fit flex-wrap items-center gap-2 max-[359px]:gap-[5px]"
            >
              <span
                aria-hidden="true"
                className="text-xs tracking-[.1em] whitespace-nowrap text-[#d7b586]"
              >
                ★★★★★
              </span>
              <span>
                <strong className="font-semibold">{RATING.score}</strong> a
                Google-on{' '}
                <span className="text-[#c5cfcb]">
                  ({RATING.count} értékelés)
                </span>
              </span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>

          <a
            href="#csomagok"
            className="mt-2 inline-flex min-h-8 items-center gap-3 text-[10px] text-[#b9c7c4]"
          >
            Csomagok és árak <span aria-hidden="true">↓</span>
          </a>
        </div>
      </div>

      {/*
        Krém hullám, amely a Hero alját a következő szekcióba vezeti át: a görbe
        fölött a fotó látszik, alatta a krém. A kitöltés ezért a következő
        szekció háttérszíne (`Sets`, #f5f1e9), nem a Heroé — a `Sets` háttere
        emiatt egyszínű, hogy az illesztés pontos legyen.
      */}
      <svg
        viewBox="0 0 1440 65"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="absolute bottom-[-1px] h-[35px] w-full text-brand-cream lg:h-[52px]"
      >
        <path d="M0 35 Q360 75 720 32 T1440 35 V65 H0Z" fill="currentColor" />
      </svg>
    </section>
  );
}
