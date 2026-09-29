import {
  STUDIO_ADDRESS,
  STUDIO_MAP_EMBED_URL,
  STUDIO_MAP_LINK,
} from '@/lib/constants';

/**
 * 2026-os arculat, új szekció. A cím a `STUDIO_ADDRESS` konstansból jön: a
 * látványterv `studio.address` mezője szándékosan üres volt, azzal a
 * megjegyzéssel, hogy a pontos címet nem szabad a térkép koordinátáiból
 * kikövetkeztetni — az éles alkalmazásban viszont már megerősített cím van.
 *
 * A térkép alatt egy statikus helyőrző ül: ha az iframe nem tölt be (blokkolt
 * harmadik fél, lassú hálózat), nem üres szürke doboz marad a helyén.
 */
export function Location() {
  return (
    <section id="helyszin" className="brand-section bg-brand-cream">
      <div className="brand-shell grid items-center gap-9 md:grid-cols-2 md:gap-16">
        <div>
          <p className="brand-eyebrow">Találkozzunk itt</p>
          <h2 className="brand-heading">
            Egy kis karácsony
            <br />
            <em>Budapest szívében.</em>
          </h2>
          <p className="brand-intro">
            Saját stúdiónkban két karácsonyi díszlettel várunk benneteket. Nézd
            meg a térképen, merre találsz minket.
          </p>

          <address className="mt-7 flex flex-col gap-2 text-xs not-italic">
            <strong className="text-sm">Karifoto Fotóstúdió</strong>
            <span className="mb-3 text-brand-muted">{STUDIO_ADDRESS}</span>
            <a
              href="tel:+36301086063"
              className="flex min-h-8 w-fit items-center"
            >
              +36 30 108 6063
            </a>
            <a
              href="mailto:info@karifoto.hu"
              className="flex min-h-8 w-fit items-center"
            >
              info@karifoto.hu
            </a>
          </address>
        </div>

        <div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-brand-ink/15 bg-[#e2e6dc]">
            <div
              aria-hidden="true"
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[radial-gradient(ellipse,#d3ddd1,#e8ebe2)] text-xs text-brand-muted"
            >
              <span className="text-5xl text-brand-ink">⌖</span>
              <strong>Karifoto Fotóstúdió</strong>
              <span>Budapest</span>
            </div>
            <iframe
              src={STUDIO_MAP_EMBED_URL}
              title="Karifoto Fotóstúdió – Google térkép"
              width={600}
              height={450}
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              className="relative h-full w-full border-0"
            />
          </div>
          <a
            href={STUDIO_MAP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex min-h-11 items-center justify-end gap-3 text-xs underline underline-offset-4"
          >
            Térkép megnyitása a Google-ben <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
