import { Wordmark } from '@/components/Wordmark';

export function Footer() {
  return (
    <footer className="border-t border-cream/[.09] bg-forest px-[18px] pt-8 pb-[150px] text-cream sm:px-7">
      <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-5 text-[13px] text-sage-dim">
        <Wordmark size={19} className="text-[#D8CBB4]" />
        <span>Budapest, VII. kerület · hello@karifoto.hu</span>
      </div>
    </footer>
  );
}
