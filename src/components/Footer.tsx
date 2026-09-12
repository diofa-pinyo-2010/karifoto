import Image from 'next/image';

export function Footer() {
  return (
    <footer className="border-t border-cream/9 bg-forest px-4.5 py-8 text-cream sm:px-7">
      <div className="mx-auto flex max-w-300 flex-wrap justify-between gap-5 text-[13px] text-sage-dim">
        <Image
          src="/images/karifoto-logo-arany.png"
          alt="Karifoto"
          width={353}
          height={146}
          priority
          className="h-7 w-auto lg:h-10"
        />
        <span>Budapest, VI. kerület · hello@karifoto.hu</span>
      </div>
    </footer>
  );
}
