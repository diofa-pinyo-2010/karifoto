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
    <section className="mx-auto w-full max-w-180 px-6 pt-14 pb-20 sm:px-10">
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

      <p className="brand-eyebrow">Fotózás</p>

      <h1 className="font-display text-[clamp(30px,5vw,44px)] leading-[1.07] font-medium text-pretty">
        {formatLongDate(photoShooting.timeSlot.startTime)}
      </h1>
      <p className="mt-5 text-[15px] leading-[1.85] text-pretty text-brand-muted">
        A galéria hamarosan elérhető lesz.
      </p>

      <Link
        href={APP_URLS.clientPortalShootingDetails(
          clientProfileId,
          photoShooting.id,
        )}
        className="mt-7 inline-block text-[15px] underline underline-offset-4 transition-opacity hover:opacity-75"
      >
        Foglalás részletei
      </Link>
    </section>
  );
}
