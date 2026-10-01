import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import {
  ArrowLeftIcon,
  CameraIcon,
  ClockIcon,
  ImagesIcon,
  LayoutDashboardIcon,
  MapPinIcon,
  MessageSquareTextIcon,
  PackageIcon,
  ReceiptTextIcon,
  SparklesIcon,
  TreePineIcon,
  UsersIcon,
} from 'lucide-react';

import { ExternalLinkItem } from '@/components/ExternalLinkItem';
import {
  Accordion,
  AccordionTrigger,
  AccordionContent,
  AccordionItem,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ItemGroup } from '@/components/ui/item';
import {
  APP_URLS,
  CLIENT_PORTAL_DEFAULT_SECTION,
  DECOR_SET_LABEL,
  hasLightPlay,
  INVOICE_STATUS_LABEL,
  isStatusBefore,
  PACKAGE_LABEL,
  PHOTO_SHOOTING_STATUS_CLIENT_BADGE_CLASSNAME,
  PHOTO_SHOOTING_STATUS_CLIENT_LABEL,
  STUDIO_ADDRESS,
  STUDIO_MAP_LINK,
} from '@/lib/constants';
import { getPortalAccess } from '@/lib/dal';
import { packages } from '@/lib/data';
import { dateWithYearFormatter, timeFormatter } from '@/lib/formatters';
import { fetchPhotoShootingForClientPortal } from '@/lib/queries';
import {
  CLIENT_PORTAL_NEXT_PARAM,
  CLIENT_PORTAL_TOKEN_PARAM,
} from '@/lib/session';
import { formatAmount } from '@/lib/utils';

import type { ClientPortalSection } from '@/lib/constants';
import type { PhotoShootingForClientPortal } from '@/lib/queries';
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

  // Any staff member, or this client themselves — see getPortalAccess().
  const access = await getPortalAccess(clientProfileId);

  if (access == null) {
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

  const photoShooting =
    await fetchPhotoShootingForClientPortal(photoShootingId);

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
      content: <ClientPortalShootingDetails shooting={photoShooting} />,
      disabled: false,
      icon: LayoutDashboardIcon,
    },
    {
      value: 'image-selection',
      trigger: 'Képválogatás',
      // Lemondott fotózásnál nincs mit válogatni, és a `isStatusBefore()`
      // szándékosan nem is válaszol rá: a CANCELLED nem a munkafolyamat vége,
      // hanem kilépés belőle. Ezért kell itt külön ág — a fül le van tiltva,
      // így ez a tartalom sosem jelenik meg.
      //
      // A válogatás előtti szakaszban csak elmagyarázzuk, mi fog történni —
      // ilyenkor még nincs mit válogatni.
      content:
        photoShooting.status === 'CANCELLED' ? null : isStatusBefore(
            photoShooting.status,
            'USER_SELECTION',
          ) ? (
          <p className="text-brand-muted">
            A fotózás után feltöltjük a nyers képeket, és itt fogjátok tudni
            kiválasztani, melyeket retusáljuk. Szólunk emailben, amint
            elindulhat a válogatás.
          </p>
        ) : (
          <p>TODO: Képválogatás content</p>
        ),
      disabled: photoShooting.status === 'CANCELLED',
      icon: ImagesIcon,
    },
    {
      value: 'invoices',
      trigger: 'Pénzügyek',
      content: <ClientPortalInvoices invoices={photoShooting.invoices} />,
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
    <section className="mx-auto flex min-h-[calc(100vh-240px)] w-full max-w-180 flex-col gap-6 px-6 pt-14 pb-20 sm:px-10">
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

      <div className="flex flex-col gap-3">
        <h1 className="font-display text-[clamp(30px,5vw,44px)] leading-[1.07] font-medium text-pretty">
          Üdv újra itt, {photoShooting.client.owner.name}!
        </h1>
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
        multiple={false}
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

// A csomagok ügyfélnek szóló szövege (`sub`) a landing oldal adataiból jön, nem
// írjuk le még egyszer. Az enum értéke nagybetűs, a `data.ts` id-je kisbetűs.
const PACKAGE_BY_ENUM = new Map(
  packages.map((item) => [item.id.toUpperCase(), item]),
);

function ClientPortalInvoices({
  invoices,
}: {
  invoices: PhotoShootingForClientPortal['invoices'];
}) {
  if (invoices.length === 0) {
    return (
      <p className="text-brand-muted">
        Még nincs számlátok ehhez a fotózáshoz. Az előlegről szóló számlát a
        foglalás után, a többit a fotózás elszámolásakor állítjuk ki.
      </p>
    );
  }

  return (
    <ItemGroup>
      {invoices.map((invoice) => (
        <ExternalLinkItem
          key={invoice.id}
          title={formatAmount(invoice.amountInCents, invoice.currency)}
          description={`${invoice.invoiceNumber} · ${INVOICE_STATUS_LABEL[invoice.status]}`}
          href={invoice.publicUrl}
          linkLabel="Számla"
        />
      ))}
    </ItemGroup>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-[#e6e0d4] py-3 last:border-b-0">
      <Icon className="mt-0.5 size-4.5 shrink-0 text-brand-muted" aria-hidden />
      <dt className="w-26 shrink-0 text-[13px] leading-6 text-brand-muted">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-[15px] leading-6">{children}</dd>
    </div>
  );
}

function ClientPortalShootingDetails({
  shooting,
}: {
  shooting: PhotoShootingForClientPortal;
}) {
  const packageInfo = PACKAGE_BY_ENUM.get(shooting.package);

  const lightPlay = hasLightPlay(
    shooting.package,
    shooting.isLightPlaySelected,
  );

  // Díszletet csak a Mini csomagnál választanak; a másik kettőben mindkettő
  // benne van, ott egyet megnevezni félrevezető lenne.
  const chosenDecorSet = shooting.package === 'MINI' ? shooting.decorSet : null;

  return (
    <dl className="flex flex-col">
      <DetailRow icon={ClockIcon} label="Kezdés">
        <span className="font-medium">
          {timeFormatter.format(shooting.timeSlot.startTime)}
        </span>
        <span className="text-brand-muted">
          {' '}
          — érdemes 5–10 perccel korábban érkezni
        </span>
      </DetailRow>

      <DetailRow icon={MapPinIcon} label="Helyszín">
        <a
          href={STUDIO_MAP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 transition-opacity hover:opacity-75"
        >
          {STUDIO_ADDRESS}
        </a>
      </DetailRow>

      {shooting.photographer && (
        <DetailRow icon={CameraIcon} label="Fotósotok">
          {shooting.photographer.nickname} ☺️
        </DetailRow>
      )}

      <DetailRow icon={PackageIcon} label="Csomag">
        <span className="font-medium">{PACKAGE_LABEL[shooting.package]}</span>
        {packageInfo && (
          <span className="block text-[13px] text-brand-muted">
            {packageInfo.sub}
          </span>
        )}
      </DetailRow>

      {chosenDecorSet && (
        <DetailRow icon={TreePineIcon} label="Díszlet">
          {DECOR_SET_LABEL[chosenDecorSet]}
        </DetailRow>
      )}

      {lightPlay && (
        <DetailRow icon={SparklesIcon} label="Fényjáték">
          Benne van a fotózásotokban ✨
        </DetailRow>
      )}

      {shooting.numberOfGuests > 0 && (
        <DetailRow icon={UsersIcon} label="Létszám">
          {shooting.numberOfGuests} fő
          {shooting.numberOfPets > 0 && ` · ${shooting.numberOfPets} kisállat`}
        </DetailRow>
      )}

      {shooting.clientNote && (
        <DetailRow icon={MessageSquareTextIcon} label="Megjegyzésetek">
          <span className="text-brand-muted italic">
            „{shooting.clientNote}”
          </span>
        </DetailRow>
      )}
    </dl>
  );
}
