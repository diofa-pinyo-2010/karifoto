import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import {
  ArrowLeftIcon,
  CameraIcon,
  ClockIcon,
  ExternalLinkIcon,
  FlagIcon,
  HeartIcon,
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
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ItemGroup } from '@/components/ui/item';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  APP_URLS,
  CLIENT_PORTAL_DEFAULT_SECTION,
  DECOR_SET_LABEL,
  EXTRA_EDIT_PER_IMAGE,
  EXTRA_RETOUCH_PER_IMAGE,
  hasLightPlay,
  INVOICE_STATUS_LABEL,
  isStatusBefore,
  PACKAGE_LABEL,
  PACKAGE_PRICES,
  PHOTO_DELIVERY_DEADLINE_DAYS_AFTER_CLIENT_MADE_SELECTION,
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
import { formatAmount, formatMoney } from '@/lib/utils';

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
          <ClientImageSelection {...photoShooting} />
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

function galleryFilterUrl(rawImagesUrl: string, filter: string) {
  const url = new URL(rawImagesUrl);
  url.searchParams.set(filter.split('=')[0], filter.split('=')[1]);
  return url.toString();
}

function ClientImageSelection({
  rawImagesUrl,
  package: shootingPackage,
}: PhotoShootingForClientPortal) {
  const allowance = PACKAGE_PRICES[shootingPackage].editedImagesAllowance;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p>Itt van a nyers képek galériája:</p>
        {rawImagesUrl != null ? (
          <a
            href={rawImagesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({
              variant: 'secondary',
              size: 'lg',
              className: 'w-full sm:w-fit',
            })}
          >
            PicDrop galéria megnyitása
            <ExternalLinkIcon />
          </a>
        ) : (
          <p className="font-bold text-red-500">
            Nem találjuk a linket :( Kérlek, hívj fel minket.
          </p>
        )}
      </div>

      <Separator />

      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold">Hogyan válogass?</h3>
        <ol className="flex flex-col gap-4">
          <li className="flex gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-ink text-sm font-semibold text-brand-paper">
              1
            </span>
            <div className="flex flex-col gap-1">
              <p className="flex items-center gap-2 font-semibold">
                <FlagIcon className="size-4 fill-black" />
                Szerkesztésre: fekete zászló
              </p>
              <p className="text-brand-muted">
                Nyisd meg a képet, kattints a zászló ikonra, és válaszd a fekete
                zászlót. Ezeket szerkesztjük meg. A csomagod{' '}
                <strong>{allowance} db</strong> szerkesztett képet tartalmaz,
                minden további kép {formatMoney(EXTRA_EDIT_PER_IMAGE)}/db.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-ink text-sm font-semibold text-brand-paper">
              2
            </span>
            <div className="flex flex-col gap-1">
              <p className="flex items-center gap-2 font-semibold">
                <HeartIcon className="size-4 fill-red-500 text-red-500" />
                Extra retusra: piros szív
              </p>
              <p className="text-brand-muted">
                Ha egy képre beauty retust kérsz (bőrsimítás, alakformálás,
                fogfehérítés stb.), jelöld a piros szívvel is. Díja{' '}
                {formatMoney(EXTRA_RETOUCH_PER_IMAGE)}/kép. A retusált képnek a
                fekete zászlós képek között is szerepelnie kell.
              </p>
            </div>
          </li>
        </ol>

        {rawImagesUrl != null && (
          <div className="flex flex-col gap-2 rounded-lg bg-brand-cream p-4">
            <p className="text-sm font-semibold">
              Ellenőrizd a megjelölt képeidet:
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <a
                href={galleryFilterUrl(rawImagesUrl, 'filterflags=final')}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({
                  variant: 'outline',
                  size: 'default',
                  className: 'fill-black',
                })}
              >
                <FlagIcon className="fill-black" />
                Fekete zászlós képek
              </a>
              <a
                href={galleryFilterUrl(rawImagesUrl, 'filterliked=1')}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({
                  variant: 'outline',
                  size: 'default',
                  className: 'fill-red-500 text-red-500',
                })}
              >
                <HeartIcon className="fill-red-500 text-red-500" />
                Piros szíves képek
              </a>
            </div>
          </div>
        )}

        <p className="text-sm text-brand-muted">
          A galériából az összes képet le is tudod tölteni a „Download … files”
          gombbal.
        </p>
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold">Végeztél? Add meg a számokat</h3>
        <p className="text-brand-muted">
          Ha a megjelölt képek száma megegyezik a csomagodéval, azonnal kezdjük
          a szerkesztést. A kész képeket a jelölés beérkezésétől számított{' '}
          {PHOTO_DELIVERY_DEADLINE_DAYS_AFTER_CLIENT_MADE_SELECTION} napon belül
          küldjük.
        </p>
        {/* TODO: bekötni egy server actionre (declaredEditedImages /
            declaredRetouchedImages). Addig nincs bekötve, a gomb tiltott. */}
        <form className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="editedImages">Fekete zászlós képek száma</Label>
              <Input
                id="editedImages"
                name="editedImages"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                className="h-10"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="retouchedImages">Piros szíves képek száma</Label>
              <Input
                id="retouchedImages"
                name="retouchedImages"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                className="h-10"
              />
            </div>
          </div>
          <Button type="submit" size="lg" disabled className="w-full sm:w-fit">
            Válogatás beküldése
          </Button>
        </form>
      </div>
    </div>
  );
}
