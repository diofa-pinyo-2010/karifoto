import { Wordmark } from '@/components/Wordmark';

export function Footer() {
  return (
    <footer className="border-t border-cream/9 bg-forest px-4.5 py-8 text-cream sm:px-7">
      <div className="mx-auto flex max-w-300 flex-wrap justify-between gap-5 text-[13px] text-sage-dim">
        <Wordmark size={19} className="text-[#D8CBB4]" />
        <span>Budapest, VI. kerület · hello@karifoto.hu</span>
      </div>
    </footer>
  );
}
