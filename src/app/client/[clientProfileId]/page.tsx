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
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-display text-3xl">
        Kedves {clientProfile.owner.name}!
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        Itt találjátok a fotózásaitokat.
      </p>

      <ul className="mt-8 space-y-3">
        {clientProfile.photoShootings.map((shooting) => (
          <li key={shooting.id}>
            <Link
              href={APP_URLS.clientPortalShooting(
                clientProfile.id,
                shooting.id,
              )}
              className="block rounded-lg border p-4 hover:bg-neutral-50"
            >
              {formatLongDate(shooting.timeSlot.startTime)}
            </Link>
          </li>
        ))}
      </ul>

      {clientProfile.photoShootings.length === 0 && (
        <p className="mt-8 text-sm text-neutral-600">
          Még nincs rögzített fotózásotok.
        </p>
      )}
    </div>
  );
}
