import type { Metadata } from 'next';
import Link from 'next/link';

import { GiftRedeemForm } from '@/components/GiftRedeemForm';
import { PACKAGE_LABEL } from '@/lib/constants';
import { formatLongDate } from '@/lib/formatters';
import { normalizeGiftCode } from '@/lib/gift';
import { getGiftShootingByCode } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Ajándék · Karifoto',
  robots: { index: false },
};

export default async function GiftRedeemPage(
  props: PageProps<'/ajandek/[giftCode]'>,
) {
  const { giftCode } = await props.params;
  const code = normalizeGiftCode(giftCode);
  const shooting = code ? await getGiftShootingByCode(code) : null;

  // Érvénytelen, ismeretlen és már nem beváltható kód: ugyanaz az üzenet, hogy
  // az oldal ne árulja el, létezik-e a kód.
  if (code == null || shooting == null) {
    return (
      <section className="mx-auto max-w-130 px-4.5 pt-14 pb-10 text-center sm:px-10">
        <div className="eyebrow-ink">Ajándék</div>
        <h1 className="mt-3.5 font-display text-[30px] leading-[1.1] font-medium text-pretty text-ink sm:text-[38px]">
          Ez az ajándék már nem váltható be.
        </h1>
        <p className="mx-auto mt-3.5 max-w-100 text-base leading-[1.6] font-light text-pretty text-cream-muted">
          Ha szerinted ez tévedés, kérd meg azt, aki a linket küldte, hogy vegye
          fel velünk a kapcsolatot.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-terracotta px-6 py-3.5 text-base font-medium text-[#FFF4E6] transition-colors hover:bg-terracotta-hover"
        >
          Vissza a főoldalra
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="bg-white/45 sm:rounded-t-[28px]">
        <div className="mx-auto max-w-130 px-4.5 pt-8 pb-7 sm:px-10">
          <div className="eyebrow-ink">Ajándék</div>
          <h1 className="mt-3.5 font-display text-[30px] leading-[1.1] font-medium text-pretty text-ink sm:text-[38px]">
            {shooting.client.owner.name} megajándékozott egy fotózással! 🎄
          </h1>

          <div className="mt-5 flex flex-col">
            <div className="flex justify-between gap-4 border-b border-ink/10 py-3">
              <span className="text-[14.5px] text-cream-muted">Időpont</span>
              <span className="text-right text-[14.5px] text-ink">
                {formatLongDate(shooting.timeSlot.startTime)}
              </span>
            </div>
            <div className="flex justify-between gap-4 border-b border-ink/10 py-3">
              <span className="text-[14.5px] text-cream-muted">Csomag</span>
              <span className="text-right text-[14.5px] text-ink">
                {PACKAGE_LABEL[shooting.package]}
              </span>
            </div>
          </div>

          <p className="mt-5 text-base leading-[1.6] font-light text-pretty text-cream-muted">
            Add meg az adataidat, és a fotózás a tiéd: a részleteket és a
            későbbi teendőket e-mailben küldjük.
          </p>
        </div>
      </section>

      <GiftRedeemForm giftCode={code} />
    </>
  );
}
