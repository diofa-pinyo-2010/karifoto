import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import {
  ArrowLeftIcon,
  ImagesIcon,
  LayoutDashboardIcon,
  ReceiptTextIcon,
} from 'lucide-react';

import {
  Accordion,
  AccordionTrigger,
  AccordionContent,
  AccordionItem,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  APP_URLS,
  CLIENT_PORTAL_DEFAULT_SECTION,
  isStatusBefore,
  PHOTO_SHOOTING_STATUS_CLIENT_BADGE_CLASSNAME,
  PHOTO_SHOOTING_STATUS_CLIENT_LABEL,
} from '@/lib/constants';
import { getClientSession, getSession } from '@/lib/dal';
import { dateWithYearFormatter } from '@/lib/formatters';
import { prisma } from '@/lib/prisma';
import {
  CLIENT_PORTAL_NEXT_PARAM,
  CLIENT_PORTAL_TOKEN_PARAM,
} from '@/lib/session';

import type { ClientPortalSection } from '@/lib/constants';
import type { LucideIcon } from 'lucide-react';

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

  const items: {
    value: ClientPortalSection;
    trigger: string;
    content: React.ReactNode;
    disabled: boolean;
    icon: LucideIcon;
  }[] = [
    {
      value: 'details',
      trigger: 'Részletek',
      content: <ClientPortalShootingDetails />,
      disabled: false,
      icon: LayoutDashboardIcon,
    },
    {
      value: 'image-selection',
      trigger: 'Képválogatás',
      // A válogatás előtti szakaszban csak elmagyarázzuk, mi fog történni —
      // ilyenkor még nincs mit válogatni.
      content: isStatusBefore(photoShooting.status, 'USER_SELECTION') ? (
        <p className="text-brand-muted">
          A fotózás után feltöltjük a nyers képeket, és itt fogjátok tudni
          kiválasztani, melyeket retusáljuk. Szólunk emailben, amint elindulhat
          a válogatás.
        </p>
      ) : (
        <p>TODO: Képválogatás content</p>
      ),
      disabled: false,
      icon: ImagesIcon,
    },
    {
      value: 'invoices',
      trigger: 'Számlák',
      content:
        'You can cancel your subscription anytime from your account settings. There are no cancellation fees or penalties. Your access will continue until the end of your current billing period.',
      disabled: false,
      icon: ReceiptTextIcon,
    },
  ];

  // `defaultValue` csak kezdőállapot: a letiltott szekciót is kinyitná, a
  // letiltott trigger viszont már nem engedné becsukni. Ezért esünk vissza az
  // áttekintésre, ha a státuszhoz tartozó szekció éppen nem élne.
  const preferredSection = CLIENT_PORTAL_DEFAULT_SECTION[photoShooting.status];
  const openByDefault = items.some(
    (item) => item.value === preferredSection && !item.disabled,
  )
    ? preferredSection
    : 'details';

  return (
    <section className="mx-auto flex w-full max-w-180 flex-col gap-6 px-6 pt-14 pb-20 sm:px-10">
      <Button
        render={<Link href={APP_URLS.clientPortalHome(clientProfileId)} />}
        nativeButton={false}
        variant="outline"
        size="lg"
        className="mb-6 w-full lg:w-fit"
      >
        <ArrowLeftIcon />
        Vissza a fotozásokhoz
      </Button>

      <div className="flex flex-col gap-2">
        <p className="brand-eyebrow m-0">Részletek</p>
        <h1 className="text-[clamp(30px,5vw,44px)] leading-[1.07] font-medium text-pretty">
          {dateWithYearFormatter.format(photoShooting.timeSlot.startTime)}
        </h1>
      </div>
      <Badge
        className={
          PHOTO_SHOOTING_STATUS_CLIENT_BADGE_CLASSNAME[photoShooting.status]
        }
      >
        {PHOTO_SHOOTING_STATUS_CLIENT_LABEL[photoShooting.status]}
      </Badge>
      <Accordion
        multiple
        defaultValue={[openByDefault]}
        className="rounded-lg border bg-white"
      >
        {items.map(({ value, trigger, content, disabled, icon: Icon }) => (
          <AccordionItem
            key={value}
            value={value}
            disabled={disabled}
            className="border-b px-4 last:border-b-0"
          >
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Icon className="size-5 opacity-60" /> {trigger}
              </div>
            </AccordionTrigger>
            <AccordionContent className="py-4">{content}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
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
    <section className="mx-auto w-full max-w-180 px-6 pt-14 pb-20 sm:px-10">
      <Button
        render={
          <Link
            href={APP_URLS.clientPortalShootingGallery(
              clientProfileId,
              photoShootingId,
            )}
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

      <p className="brand-eyebrow">Védett oldal</p>

      <h1 className="font-display text-[clamp(30px,5vw,44px)] leading-[1.07] font-medium text-pretty">
        Ez az oldal védett
      </h1>
      <p className="mt-5 text-[15px] leading-[1.85] text-pretty text-brand-muted">
        A foglalás részleteit csak a visszaigazoló emailben kapott
        „Ügyfélportál” gombra kattintva tudjátok megnyitni. Érdemes megtartani
        azt az emailt — a link bármikor újra használható.
      </p>
    </section>
  );
}

function ClientPortalShootingDetails() {
  return <div>Részletek</div>;
}
