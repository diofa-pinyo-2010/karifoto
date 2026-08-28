import { faqs } from '@/lib/data';

export function Faq() {
  return (
    <section
      id="gyik"
      className="mx-auto max-w-[840px] px-[18px] pt-[52px] pb-16 sm:px-7 sm:pt-20 sm:pb-[110px]"
    >
      <h2 className="mb-6 text-center font-display text-[29px] font-medium text-cream-strong sm:mb-[30px] sm:text-[42px]">
        Gyakori kérdések
      </h2>

      <div className="flex flex-col gap-3">
        {faqs.map((f) => (
          <div
            key={f.q}
            className="rounded-2xl border border-cream/[.09] bg-panel px-6 py-[22px]"
          >
            <div className="text-[17px] text-[#F1E7D5]">{f.q}</div>
            <div className="mt-2 text-[15px] leading-[1.6] font-light text-sage-soft">
              {f.a}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-11 text-center">
        <a
          href="#foglalas"
          className="btn-cta px-7 py-[18px] text-base shadow-[0_16px_40px_rgba(184,80,58,.34)] sm:px-11 sm:text-[17px]"
        >
          Foglalok időpontot →
        </a>
      </div>
    </section>
  );
}
