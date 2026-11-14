import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import {
  ArrowLeftIcon,
  CameraIcon,
  CheckIcon,
  ClockIcon,
  ExternalLinkIcon,
  FlagIcon,
  ImageIcon,
  ImagesIcon,
  LayoutDashboardIcon,
  MapPinIcon,
  MessageSquareTextIcon,
  PackageIcon,
  PlusIcon,
  ReceiptTextIcon,
  SparklesIcon,
  TreePineIcon,
  UsersIcon,
  ZapIcon,
} from 'lucide-react';

import { ExternalLinkItem } from '@/components/ExternalLinkItem';
import { ImageSelectionDialog } from '@/components/ImageSelectionDialog';
import {
  Accordion,
  AccordionTrigger,
  AccordionContent,
  AccordionItem,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { ItemGroup } from '@/components/ui/item';
import { Separator } from '@/components/ui/separator';
import { buildSub, PACKAGES } from '@/lib/catalog';
import {
  APP_URLS,
  CLIENT_PORTAL_DEFAULT_SECTION,
  DECOR_SET_LABEL,
  EXTRA_EDIT_PER_IMAGE,
  EXTRA_BEAUTY_RETOUCH_PER_IMAGE,
  hasLightPlay,
  INVOICE_STATUS_LABEL,
  isStatusBefore,
  PACKAGE_LABEL,
  PHOTO_DELIVERY_DEADLINE_DAYS_AFTER_CLIENT_MADE_SELECTION,
  PHOTO_SHOOTING_STATUS_CLIENT_BADGE_CLASSNAME,
  PHOTO_SHOOTING_STATUS_CLIENT_LABEL,
  STUDIO_ADDRESS,
  STUDIO_MAP_LINK,
  PHOTO_DELIVERY_DEADLINE_DAYS_AFTER_CLIENT_MADE_SELECTION_EXPRESS,
} from '@/lib/constants';
import { arrivalSuggestions } from '@/lib/constants-jsx';
import { getPortalAccess } from '@/lib/dal';
import {
  dateWithYearFormatter,
  // monthDayFormatter,
  timeFormatter,
} from '@/lib/formatters';
// import { buildPicdropFilterUrl } from '@/lib/picdrop-filter';
import { fetchPhotoShootingForClientPortal } from '@/lib/queries';
import {
  CLIENT_PORTAL_NEXT_PARAM,
  CLIENT_PORTAL_TOKEN_PARAM,
} from '@/lib/session';
import {
  formatMoney,
  //   getDeliveryDeadline
} from '@/lib/utils';

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
          <ClientImageSelection
            {...photoShooting}
            canSubmit={access.as === 'client'}
          />
        ),
      disabled: photoShooting.status === 'CANCELLED',
      icon: ImagesIcon,
    },
    {
      value: 'final-images',
      trigger: 'Szerkesztett képek',
      content: <ClientFinalImages {...photoShooting} />,
      disabled: photoShooting.status === 'CANCELLED',
      icon: ImageIcon,
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
        key={photoShooting.status}
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
          title={formatMoney(invoice.amountInCents)}
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
        <span className="text-brand-muted"> — {arrivalSuggestions}</span>
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
        <span className="block text-[13px] text-brand-muted">
          {buildSub(PACKAGES[shooting.package])}
        </span>
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

function ClientFinalImages({
  status,
  finalImagesUrl,
}: PhotoShootingForClientPortal) {
  if (status !== 'COMPLETED' || finalImagesUrl == null) {
    return (
      <p className="text-brand-muted">
        A szerkesztett képeket itt fogjátok megtalálni. Szólunk emailben, amint
        elkészültek.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p>
        Elkészültek a szerkesztett képeitek! A PicDrop galériában tudjátok
        megnézni és letölteni őket.
      </p>
      <a
        href={finalImagesUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({
          variant: 'secondary',
          size: 'lg',
          className: 'w-full sm:w-fit',
        })}
      >
        Szerkesztett képek megnyitása
        <ExternalLinkIcon />
      </a>
    </div>
  );
}

function ClientImageSelection({
  id,
  clientId,
  rawImagesUrl,
  package: shootingPackage,
  selectionCompletedAt,
  declaredEditedImages,
  declaredRetouchedImages,
  isExpressPostProduction,
  canSubmit,
}: PhotoShootingForClientPortal & { canSubmit: boolean }) {
  if (selectionCompletedAt != null) {
    return (
      <div className="flex flex-col gap-5 rounded-lg border border-brand-free-edge bg-brand-free-surface p-5 text-brand-free">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-free text-brand-paper">
            <CheckIcon className="size-5" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-lg font-semibold">
              Megkaptuk a válogatásotokat, köszönjük!
            </p>
            <p className="text-sm text-brand-free/80">
              Már dolgozunk rajta. A kész képeket hamarosan küldjük emailben.
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3">
          {isExpressPostProduction && (
            <div className="col-span-2 flex flex-col gap-1 rounded-md bg-white/70 p-3">
              <dt className="flex items-center gap-1.5 text-xs font-medium">
                <ZapIcon className="size-3.5 fill-current" />
                Expressz utómunka{' '}
                {
                  PHOTO_DELIVERY_DEADLINE_DAYS_AFTER_CLIENT_MADE_SELECTION_EXPRESS
                }{' '}
                napon belül!
              </dt>
              {/* <dd className="text-lg font-semibold">
                A kész képeket legkésőbb ekkor küldjük:{' '}
                {monthDayFormatter.format(
                  getDeliveryDeadline(selectionCompletedAt, true),
                )}
              </dd> */}
            </div>
          )}
          <div className="flex flex-col gap-1 rounded-md bg-white/70 p-3">
            <dt className="flex items-center gap-1.5 text-xs font-medium">
              <FlagIcon className="size-3.5 fill-red-500 text-red-500" />
              Szerkesztésre
            </dt>
            <dd className="text-2xl font-semibold">
              {declaredEditedImages ?? 0} db
            </dd>
          </div>
          <div className="flex flex-col gap-1 rounded-md bg-white/70 p-3">
            <dt className="flex items-center gap-1.5 text-xs font-medium">
              <FlagIcon className="size-3.5 fill-current" />
              Extra retusra
            </dt>
            <dd className="text-2xl font-semibold">
              {declaredRetouchedImages ?? 0} db
            </dd>
          </div>
        </dl>
      </div>
    );
  }

  const allowance = PACKAGES[shootingPackage].editedImagesAllowance;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p>
          🎄 Köszönjük, hogy részt vettetek karácsonyi fotózásunkon! Meghoztuk a{' '}
          <strong>nyers képeket</strong>! 🎉
        </p>
        <p className="text-center font-bold underline underline-offset-4">
          Kérjük, olvassátok el figyelmesen az alábbiakat!
        </p>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <div className="rounded-full bg-brand-accent p-1">
            <FlagIcon className="size-4 text-brand-champagne-hover" />
          </div>
          Válogatás, utómunka
        </h2>
        <p>
          A következő lépésben kiválaszthatjátok azokat a képeket, amiket
          megszerkesztünk, utómunkázunk a számotokra. A megvásárolt csomagotok a{' '}
          <strong>{PACKAGE_LABEL[shootingPackage]}</strong> volt, ami már
          tartalmazza
        </p>
        <p className="m-0 text-center text-2xl font-black">{allowance} kép</p>
        <p>megszerkesztését, vagyis ennyit bátran megjelölhettek.</p>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <div className="rounded-full bg-brand-accent p-1">
            <PlusIcon className="size-4 text-brand-champagne-hover" />
          </div>
          Plusz képek rendelése
        </h2>
        <p>
          Több képet is kiválaszthattok, mint {allowance}. A plusz képek ára{' '}
          <strong>{formatMoney(EXTRA_EDIT_PER_IMAGE)}/kép</strong>.
        </p>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <div className="rounded-full bg-brand-accent p-1">
            <SparklesIcon className="size-4 text-brand-champagne-hover" />
          </div>
          Mit tartalmaz a szerkesztés?
        </h2>
        <p className="m-0! font-semibold">A kiválasztott képeken:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>szín- és fénykorrekciót végzünk,</li>
          <li>javítjuk a kép dőlését,</li>
          <li>és méretre vágjuk a fotót</li>
        </ul>
        <p className="m-0! font-semibold">
          Ha szeretnél extra (beauty) retust, például:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>bőr kisimítás,</li>
          <li>fogfehérítés,</li>
          <li>vagy egyéb esztétikai módosítás,</li>
          ennek díja{' '}
          <strong>{formatMoney(EXTRA_BEAUTY_RETOUCH_PER_IMAGE)}/kép</strong>.
        </ul>
        <Separator />
        <h3 className="text-lg font-semibold">Hogyan válogass?</h3>
        <ol className="flex flex-col gap-4">
          <li className="flex gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-ink text-sm font-semibold text-brand-paper">
              1
            </span>
            <div className="flex flex-col gap-1">
              <p className="flex items-center gap-2 font-semibold">
                Szerkesztésre: piros zászló
                <FlagIcon className="size-4 fill-red-500 text-red-500" />
              </p>
              <p className="text-brand-muted">
                Nyisd meg a képet, kattints a zászló ikonra bal alul, és válaszd
                a piros zászlót ("Kiválasztott"). Ezeket szerkesztjük meg. A
                csomagod <strong>{allowance} db</strong> szerkesztett képet
                tartalmaz.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-ink text-sm font-semibold text-brand-paper">
              2
            </span>
            <div className="flex flex-col gap-1">
              <p className="flex items-center gap-2 font-semibold">
                Extra (beauty) retusra: fekete zászló
                <FlagIcon className="size-4 fill-black text-black" />
              </p>
              <p className="text-brand-muted">
                Ha egy képre beauty retust kérsz (bőrsimítás, alakformálás,
                fogfehérítés stb.), jelöld fekete zászlóval. Díja{' '}
                {formatMoney(EXTRA_BEAUTY_RETOUCH_PER_IMAGE)}/kép. Az így
                megjelölt képekhez egy rövid leírást kérünk, hogy a retusőr
                kollégánk tudja, min dolgozzon.
              </p>
            </div>
          </li>
        </ol>
        <div className="flex flex-col gap-2">
          <p className="text-lg font-bold">Nyisd meg a galériát:</p>
          {rawImagesUrl != null ? (
            <a
              href={rawImagesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({
                variant: 'default',
                size: 'lg',
                className: 'w-full sm:w-fit',
              })}
            >
              Nyers képek
              <ExternalLinkIcon />
            </a>
          ) : (
            <p className="font-bold text-red-500">
              Nem találjuk a linket :( Kérlek, hívj fel minket.
            </p>
          )}
        </div>
        <p className="text-lg font-bold">
          Amikor végeztél a válogatással, gyere ide vissza.
        </p>
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold">Végeztél a jelöléssel?</h3>
        <p className="text-brand-muted">
          Kattints a „Kész vagyok” gombra: megszámoljuk a galériában megjelölt
          képeket, és megmutatjuk, jár-e vele extra díj. Ha a megjelölt képek
          száma belefér a csomagodba, akkor küldheted, és azonnal kezdjük a
          szerkesztést. A kész képeket a jelölés beérkezésétől számított{' '}
          <strong>
            {PHOTO_DELIVERY_DEADLINE_DAYS_AFTER_CLIENT_MADE_SELECTION} napon
            belül
          </strong>{' '}
          küldjük.
        </p>
        <ImageSelectionDialog
          clientProfileId={clientId}
          shootingId={id}
          disabled={!canSubmit}
        />
      </div>
    </div>
  );
}
