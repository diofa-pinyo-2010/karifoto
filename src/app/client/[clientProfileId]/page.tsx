import Link from 'next/link';
import { notFound } from 'next/navigation';

import { APP_URLS } from '@/lib/constants';
import { formatLongDate } from '@/lib/formatters';
import { prisma } from '@/lib/prisma';

// Public on purpose. The only thing protecting this page is the
// clientProfileId being an unguessable UUID — and since that id also prefixes
// the shareable per-shooting URL, anyone the client shares a gallery with can
// reach this list too. That's an accepted tradeoff, which is why nothing
// sensitive (amounts, invoices, billing) may ever be rendered here.
export default async function ClientPortalHomePage({
  params,
}: PageProps<'/client/[clientProfileId]'>) {
  const { clientProfileId } = await params;

  const clientProfile = await prisma.clientProfile.findUnique({
    where: { id: clientProfileId },
    select: {
      id: true,
      owner: { select: { name: true } },
      photoShootings: {
        select: { id: true, timeSlot: { select: { startTime: true } } },
        orderBy: { timeSlot: { startTime: 'desc' } },
      },
    },
  });

  if (!clientProfile) {
    notFound();
  }

  return (
    <section className="mx-auto w-full max-w-180 px-6 pt-14 pb-20 sm:px-10">
      <p className="brand-eyebrow">Ügyfélportál</p>

      <h1 className="font-display text-[clamp(30px,5vw,44px)] leading-[1.07] font-medium text-pretty">
        Üdv újra itt, {clientProfile.owner.name}!
      </h1>
      <p className="mt-5 text-[15px] leading-[1.85] text-pretty text-brand-muted">
        Itt találjátok a fotózásaitokat.
      </p>

      {clientProfile.photoShootings.length === 0 ? (
        <p className="mt-7 text-[15px] leading-[1.85] text-pretty text-brand-muted">
          Még nincs rögzített fotózásotok.
        </p>
      ) : (
        <ul className="mt-7 space-y-3">
          {clientProfile.photoShootings.map((shooting) => (
            <li key={shooting.id}>
              <Link
                href={APP_URLS.clientPortalShooting(
                  clientProfile.id,
                  shooting.id,
                )}
                className="block rounded-2xl border border-[#d9d3c7] bg-brand-paper px-5 py-4 text-[15px] transition-colors hover:border-brand-champagne"
              >
                {formatLongDate(shooting.timeSlot.startTime)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
