import Link from 'next/link';

import { ArrowLeft } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@/components/ui/item';
import { Separator } from '@/components/ui/separator';
import { Currency } from '@/generated/prisma/client';
import {
  DECOR_SET_LABEL,
  LEDGER_ENTRY_CATEGORY_LABEL,
  PACKAGE_LABEL,
  PAYMENT_METHOD_LABEL,
  PHOTO_SHOOTING_STATUS_LABEL,
} from '@/lib/constants';
import {
  dateFormatter,
  shortFullDateFormatter,
  timeFormatter,
} from '@/lib/formatters';
import { capitalize, formatMoney } from '@/lib/utils';
import { getPhotoShooting } from '@/server/photo-shootings';

function formatAmount(amountInCents: number, currency: Currency): string {
  if (currency === 'HUF') return formatMoney(amountInCents);
  return `${(amountInCents / 100).toLocaleString('hu-HU')} ${currency}`;
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

export default async function PhotoShootingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shooting = await getPhotoShooting(id);

  const backButton = (
    <Button
      variant="ghost"
      size="sm"
      className="w-fit"
      nativeButton={false}
      render={<Link href="/admin/bookings" />}
    >
      <ArrowLeft />
      Vissza a fotózásokhoz
    </Button>
  );

  if (shooting == null) {
    return (
      <div className="mx-auto flex w-full flex-col gap-6 lg:w-3xl">
        {backButton}
        <h1 className="text-lg font-semibold text-muted-foreground lg:text-2xl">
          Fotózás részletei
        </h1>
        <p className="text-muted-foreground">Ez a fotózás nem található.</p>
      </div>
    );
  }

  const { client, timeSlot, photographer, editor, ledgerEntries } = shooting;

  return (
    <div className="mx-auto flex w-full flex-col gap-6 lg:w-3xl">
      {backButton}
      <h1 className="text-lg font-semibold text-muted-foreground lg:text-2xl">
        Fotózás részletei
      </h1>

      <div className="rounded-lg border px-4">
        <DetailRow
          label="Időpont"
          value={`${capitalize(dateFormatter.format(timeSlot.startTime))} · ${timeFormatter.format(timeSlot.startTime)}–${timeFormatter.format(timeSlot.endTime)}`}
        />
        <DetailRow label="Ügyfél" value={client.owner.name} />
        <DetailRow
          label="Telefon"
          value={
            <a href={`tel:${client.owner.phoneNumber}`}>
              {client.owner.phoneNumber}
            </a>
          }
        />
        <DetailRow label="E-mail cím" value={client.owner.email} />
        <DetailRow label="Megjegyzés" value={shooting.clientNote ?? '-'} />
        <DetailRow
          label="Státusz"
          value={
            <Badge variant="secondary">
              {PHOTO_SHOOTING_STATUS_LABEL[shooting.status]}
            </Badge>
          }
        />
      </div>

      <Separator />

      <div className="rounded-lg border px-4">
        <DetailRow label="Csomag" value={PACKAGE_LABEL[shooting.package]} />
        <DetailRow
          label="Dekor"
          value={shooting.decorSet ? DECOR_SET_LABEL[shooting.decorSet] : '-'}
        />
        <DetailRow
          label="Fényjáték"
          value={shooting.isLightPlaySelected ? 'Igen' : 'Nem'}
        />
      </div>

      <Separator />

      <div className="rounded-lg border px-4">
        <DetailRow
          label="Vendégek száma"
          value={String(shooting.numberOfGuests)}
        />
        <DetailRow
          label="Kisállatok száma"
          value={String(shooting.numberOfPets)}
        />
      </div>

      <Separator />

      <div className="rounded-lg border px-4">
        <DetailRow
          label="Fotós"
          value={
            photographer ? (
              <a href={`tel:${photographer.owner.phoneNumber}`}>
                {photographer.owner.name} ({photographer.owner.phoneNumber})
              </a>
            ) : (
              'Nincs kiválasztva'
            )
          }
        />
        <DetailRow
          label="PicDrop - Nyers képek"
          value={
            shooting.rawImagesUrl ? (
              <a
                href={shooting.rawImagesUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Megnyitás
              </a>
            ) : (
              '-'
            )
          }
        />
      </div>

      <Separator />

      <div className="rounded-lg border px-4">
        <DetailRow
          label="Szerkesztő"
          value={
            editor ? (
              <a href={`tel:${editor.owner.phoneNumber}`}>
                {editor.owner.name} ({editor.owner.phoneNumber})
              </a>
            ) : (
              'Nincs kiválasztva'
            )
          }
        />
        <DetailRow
          label="PicDrop - Végleges képek"
          value={
            shooting.finalImagesUrl ? (
              <a
                href={shooting.finalImagesUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Megnyitás
              </a>
            ) : (
              '-'
            )
          }
        />
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Pénzügyi tételek</h2>
        {ledgerEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nincsenek pénzügyi tételek.
          </p>
        ) : (
          <ItemGroup>
            {ledgerEntries.map((entry) => (
              <Item key={entry.id} variant="outline">
                <ItemContent>
                  <ItemTitle>
                    {LEDGER_ENTRY_CATEGORY_LABEL[entry.category]} ·{' '}
                    {formatAmount(entry.amountInCents, entry.currency)}
                  </ItemTitle>
                  <ItemDescription>
                    {shortFullDateFormatter.format(entry.createdAt)} ·{' '}
                    {PAYMENT_METHOD_LABEL[entry.method]}
                  </ItemDescription>
                </ItemContent>
                {entry.invoice && (
                  <ItemActions>
                    <Button
                      size="sm"
                      variant="outline"
                      nativeButton={false}
                      render={
                        <a
                          href={entry.invoice.publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Számla"
                        />
                      }
                    >
                      Számla
                    </Button>
                  </ItemActions>
                )}
              </Item>
            ))}
          </ItemGroup>
        )}
      </div>
    </div>
  );
}
