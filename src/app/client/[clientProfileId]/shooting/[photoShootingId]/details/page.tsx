import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { ArrowLeftIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { APP_URLS } from '@/lib/constants';
import { getClientSession, getSession } from '@/lib/dal';
import { formatLongDate } from '@/lib/formatters';
import { prisma } from '@/lib/prisma';
import {
  CLIENT_PORTAL_NEXT_PARAM,
  CLIENT_PORTAL_TOKEN_PARAM,
} from '@/lib/session';

// The gated tier: payments and invoices. Reachable with a client_session (the
// client themselves) or an admin_session (any staff member supporting them by
// phone or email — no role carve-out).
export default async function ClientPortalShootingDetailsPage({
  params,
  searchParams,
}: PageProps<'/client/[clientProfileId]/shooting/[photoShootingId]/details'>) {
  const { clientProfileId, photoShootingId } = await params;
  const detailsPath = APP_URLS.clientPortalShootingDetails(
    clientProfileId,
    photoShootingId,
  );

  const [adminSession, clientSession] = await Promise.all([
    getSession(),
    getClientSession(),
  ]);

  // Row-scoping: a valid client_session proves *a* client is logged in, not
  // that they're *this* client. Staff are exempt — they're allowed to view any
  // client's shooting.
  const hasAccess =
    adminSession != null || clientSession?.clientProfile.id === clientProfileId;

  if (!hasAccess) {
    const token = (await searchParams)[CLIENT_PORTAL_TOKEN_PARAM];

    // The emailed link lands here carrying its token. A Server Component can't
    // set a cookie during render, so hand off to the route handler and let it
    // send the client back to this same page with a clean URL.
    if (typeof token === 'string' && token !== '') {
      const verifyUrl = new URLSearchParams({
        [CLIENT_PORTAL_TOKEN_PARAM]: token,
        [CLIENT_PORTAL_NEXT_PARAM]: detailsPath,
      });

      redirect(`${APP_URLS.clientPortalVerify}?${verifyUrl.toString()}`);
    }

    return (
      <ClientPortalAccessDenied
        clientProfileId={clientProfileId}
        photoShootingId={photoShootingId}
      />
    );
  }

  const photoShooting = await prisma.photoShooting.findUnique({
    where: { id: photoShootingId },
    select: {
      id: true,
      clientId: true,
      status: true,
      timeSlot: { select: { startTime: true } },
    },
  });

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
      <h1 className="font-display text-3xl">A foglalás részletei</h1>
      <p className="mt-2 text-sm text-neutral-600">
        {formatLongDate(photoShooting.timeSlot.startTime)} ·{' '}
        {photoShooting.status}
      </p>
      <p className="mt-8 text-sm text-neutral-600">
        A fizetési és számlázási részletek hamarosan itt lesznek láthatóak.
      </p>
    </div>
  );
}

function ClientPortalAccessDenied({
  clientProfileId,
  photoShootingId,
}: {
  clientProfileId: string;
  photoShootingId: string;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Button
        render={
          <Link
            href={`/client/${clientProfileId}/shooting/${photoShootingId}`}
          />
        }
        nativeButton={false}
        variant="outline"
        size="lg"
        className="mb-6 w-full lg:w-fit"
      >
        <ArrowLeftIcon />
        Vissza az áttekintőhöz
      </Button>
      <h1 className="font-display text-3xl">Ez az oldal védett</h1>
      <p className="mt-4 text-sm text-neutral-600">
        A foglalás részleteit csak a visszaigazoló emailben kapott
        „Ügyfélportál” gombra kattintva tudjátok megnyitni. Érdemes megtartani
        azt az emailt — a link bármikor újra használható.
      </p>
    </div>
  );
}
