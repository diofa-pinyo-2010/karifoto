import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ArrowLeftIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { APP_URLS } from '@/lib/constants';
import { formatLongDate } from '@/lib/formatters';
import { prisma } from '@/lib/prisma';

// This is the URL clients are meant to share ("nézzétek meg a képeinket!"), so
// it stays public and must never issue a session cookie. Placeholder gallery
// for now.
export default async function ClientPortalShootingPage({
  params,
}: PageProps<'/client/[clientProfileId]/shooting/[photoShootingId]'>) {
  const { clientProfileId, photoShootingId } = await params;

  const photoShooting = await prisma.photoShooting.findUnique({
    where: { id: photoShootingId },
    select: {
      id: true,
      clientId: true,
      timeSlot: { select: { startTime: true } },
    },
  });

  // Scoping the shooting to the client in the URL matters even here, where
  // both segments are public: without it a mismatched pair would render, and
  // the page would confirm that some other client's shooting id exists.
  if (!photoShooting || photoShooting.clientId !== clientProfileId) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Button
        render={<Link href={`/client/${clientProfileId}`} />}
        nativeButton={false}
        variant="outline"
        size="lg"
        className="mb-6 w-full lg:w-fit"
      >
        <ArrowLeftIcon />
        Vissza a fotozásokhoz
      </Button>
      <h1 className="font-display text-3xl">
        {formatLongDate(photoShooting.timeSlot.startTime)}
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        A galéria hamarosan elérhető lesz.
      </p>

      <Link
        href={APP_URLS.clientPortalShootingDetails(
          clientProfileId,
          photoShooting.id,
        )}
        className="mt-8 inline-block underline underline-offset-4"
      >
        Foglalás részletei
      </Link>
    </div>
  );
}
