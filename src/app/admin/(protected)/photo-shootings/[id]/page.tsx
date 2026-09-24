import Link from 'next/link';

import { ArrowLeft, ExternalLinkIcon } from 'lucide-react';

import { EditableComboboxField } from '@/components/EditableComboboxField';
import { EditableTextField } from '@/components/EditableTextField';
import { RefreshStatusButton } from '@/components/RefreshStatusButton';
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
import { Currency, PaymentMethod } from '@/generated/prisma/client';
import {
  booleanToYesNo,
  DECOR_SET_COMBOBOX_ITEMS,
  DECOR_SET_LABEL,
  LEDGER_ENTRY_CATEGORY_LABEL,
  PACKAGE_LABEL,
  PAYMENT_METHOD_LABEL,
  PHOTO_SHOOTING_STATUS_BADGE_CLASSNAME,
  PHOTO_SHOOTING_STATUS_LABEL,
  YES_NO_COMBOBOX_ITEMS,
} from '@/lib/constants';
import { dateFormatter, timeFormatter } from '@/lib/formatters';
import { capitalize, cn, formatMoney } from '@/lib/utils';
import {
  fetchPhotographers,
  fetchEditors,
  recalculatePhotoShootingStatus,
  updatePhotoShootingField,
} from '@/server/admin';
import { getPhotoShooting } from '@/server/photo-shootings';
import { calculateRemainingAmount } from '@/server/pricing';

function formatAmount(amountInCents: number, currency: Currency): string {
  if (currency === 'HUF') return formatMoney(amountInCents);
  return `${(amountInCents / 100).toLocaleString('hu-HU')} ${currency}`;
}

export function DetailRow({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value: React.ReactNode;
  /** Lets the value take up the row's remaining width instead of hugging its content. */
  fullWidth?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          'text-right text-sm font-medium',
          fullWidth && 'min-w-0 flex-1',
        )}
      >
        {value}
      </span>
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
  const photographers = await fetchPhotographers();
  const editors = await fetchEditors();
  const photographerItems = photographers.map((p) => ({
    value: p.id,
    label: p.owner.name,
  }));
  const editorItems = editors.map((e) => ({
    value: e.id,
    label: e.owner.name,
  }));

  const backButton = (
    <Button
      variant="outline"
      size="lg"
      className="w-fit"
      nativeButton={false}
      render={<Link href="/admin/bookings" />}
    >
      <ArrowLeft />
      Vissza a fotózásokhoz
    </Button>
  );

  if (shooting == null || shooting.pricing == null) {
    return (
      <div className="mx-auto flex w-full flex-col gap-6 lg:w-3xl">
        {backButton}
        <h1 className="text-lg font-semibold text-muted-foreground lg:text-2xl">
          Fotózás részletei
        </h1>
        <p className="text-muted-foreground">Ez a fotózás nem található.</p>
        <p className="text-muted-foreground">
          shooting == null || shooting.pricing == null
        </p>
      </div>
    );
  }

  const {
    client,
    timeSlot,
    photographer,
    editor,
    ledgerEntries,
    rawImagesUrl,
    finalImagesUrl,
    pricing,
    adjustments,
    isLightPlaySelected,
    decorSet,
  } = shooting;

  const extraPeople = Math.max(
    0,
    shooting.numberOfGuests - pricing.extraPeopleThreshold,
  );

  const remainingAmount = calculateRemainingAmount({
    pricing,
    shooting,
    adjustments,
    ledgerEntries,
  });

  return (
    <div className="mx-auto flex w-full flex-col gap-10 lg:w-3xl">
      {backButton}
      <div className="flex flex-col gap-1">
        <div className="mb-2 flex items-center gap-2">
          <Badge
            variant="secondary"
            className={cn(
              PHOTO_SHOOTING_STATUS_BADGE_CLASSNAME[shooting.status],
              'rounded-lg p-3 lg:p-4',
            )}
          >
            {PHOTO_SHOOTING_STATUS_LABEL[shooting.status]}
          </Badge>
          <RefreshStatusButton
            action={recalculatePhotoShootingStatus.bind(null, shooting.id)}
          />
        </div>
        <h1 className="text-3xl font-semibold text-primary lg:text-4xl dark:text-primary-foreground">
          {client.owner.name}
        </h1>
        <h2 className="text-lg font-medium text-muted-foreground lg:text-2xl">
          {capitalize(dateFormatter.format(timeSlot.startTime))} •{' '}
          {timeFormatter.format(timeSlot.startTime)}
        </h2>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-medium">Ügyfél</h3>
        <div className="rounded-lg border px-4">
          <DetailRow
            label="Telefon"
            value={
              <a
                href={`tel:${client.owner.phoneNumber}`}
                className="text-blue-600 underline underline-offset-4 dark:text-blue-300"
              >
                {client.owner.phoneNumber}
              </a>
            }
          />
          <DetailRow label="E-mail cím" value={client.owner.email} />
          <DetailRow label="Megjegyzés" value={shooting.clientNote ?? '–'} />
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-medium">Részletek</h3>
        <div className="rounded-lg border px-4">
          <DetailRow label="Csomag" value={PACKAGE_LABEL[shooting.package]} />
          <DetailRow
            label="Díszlet"
            value={
              <EditableComboboxField
                value={
                  decorSet
                    ? { value: decorSet, label: DECOR_SET_LABEL[decorSet] }
                    : null
                }
                items={DECOR_SET_COMBOBOX_ITEMS}
                placeholder="Válassz díszletet!"
                onSave={updatePhotoShootingField.bind(
                  null,
                  shooting.id,
                  'decorSet',
                )}
                emptyLabel="–"
              />
            }
          />
          <DetailRow
            label="Fényjáték"
            value={
              <EditableComboboxField
                value={{
                  label: booleanToYesNo(isLightPlaySelected),
                  value: booleanToYesNo(isLightPlaySelected),
                }}
                items={YES_NO_COMBOBOX_ITEMS}
                onSave={updatePhotoShootingField.bind(
                  null,
                  shooting.id,
                  'isLightPlaySelected',
                )}
              />
            }
          />
          <DetailRow
            label="Vendégek száma"
            value={
              <EditableTextField
                type="number"
                inputMode="numeric"
                value={String(shooting.numberOfGuests)}
                onSave={updatePhotoShootingField.bind(
                  null,
                  shooting.id,
                  'numberOfGuests',
                )}
              />
            }
          />
          <DetailRow
            label="Kisállatok száma"
            value={
              <EditableTextField
                type="number"
                inputMode="numeric"
                value={String(shooting.numberOfPets)}
                onSave={updatePhotoShootingField.bind(
                  null,
                  shooting.id,
                  'numberOfPets',
                )}
              />
            }
          />
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-medium">A fotózás napja</h3>
        <div className="rounded-lg border px-4">
          <DetailRow
            label="Fotós"
            value={
              <EditableComboboxField
                value={
                  photographer
                    ? { value: photographer.id, label: photographer.owner.name }
                    : null
                }
                displayValue={
                  photographer && (
                    <p>
                      {photographer.nickname} ({' '}
                      <a
                        href={`tel:${photographer.owner.phoneNumber}`}
                        className="text-blue-600 underline underline-offset-4 dark:text-blue-300"
                      >
                        {photographer.owner.phoneNumber}
                      </a>{' '}
                      )
                    </p>
                  )
                }
                items={photographerItems}
                placeholder="Válassz fotóst!"
                onSave={updatePhotoShootingField.bind(
                  null,
                  shooting.id,
                  'photographerId',
                )}
              />
            }
          />
          <DetailRow
            label="Csomag ára"
            value={formatAmount(pricing.packagePriceInCents, 'HUF')}
          />
          <DetailRow
            label="Studio bérlet"
            value={formatAmount(pricing.packageStudioPriceInCents, 'HUF')}
          />
          <DetailRow
            label="Fényjáték ára"
            value={formatAmount(
              Number(isLightPlaySelected) * pricing.lightPlayPriceInCents,
              'HUF',
            )}
          />
          <DetailRow
            label={`Extra személyek (${extraPeople})`}
            value={formatAmount(
              extraPeople * pricing.extraPeopleRateInCents,
              'HUF',
            )}
          />
          <DetailRow
            label={`Kis kedvencek (${shooting.numberOfPets})`}
            value={formatAmount(
              shooting.numberOfPets * pricing.extraPetRateInCents,
              'HUF',
            )}
          />
          {adjustments.map((adjustment) => (
            <DetailRow
              key={adjustment.id}
              label={adjustment.reason}
              value={formatAmount(adjustment.amountInCents * -1, 'HUF')}
            />
          ))}
        </div>
        <div className="rounded-lg border px-4">
          {ledgerEntries.map((ledgerEntry) => {
            return (
              <DetailRow
                key={ledgerEntry.id}
                label={`${LEDGER_ENTRY_CATEGORY_LABEL[ledgerEntry.category]} (${PAYMENT_METHOD_LABEL[ledgerEntry.invoice?.paymentMethod as PaymentMethod]})`}
                value={formatAmount(
                  ledgerEntry.category.startsWith('INCOME')
                    ? ledgerEntry.amountInCents * -1
                    : ledgerEntry.amountInCents,
                  ledgerEntry.currency,
                )}
              />
            );
          })}
        </div>
        <div className="rounded-lg border px-4">
          <DetailRow
            label="Fizetendő még"
            value={formatAmount(remainingAmount, 'HUF')}
          />
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-medium">Utómunka</h3>
        <div className="rounded-lg border px-4">
          <DetailRow
            label="Nyers képek (PicDrop URL)"
            fullWidth
            value={
              <EditableTextField
                value={rawImagesUrl}
                inputMode="url"
                displayValue={
                  rawImagesUrl && (
                    <a
                      href={rawImagesUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 underline underline-offset-4 dark:text-blue-300"
                    >
                      PicDrop
                      <ExternalLinkIcon className="size-4" />
                    </a>
                  )
                }
                onSave={updatePhotoShootingField.bind(
                  null,
                  shooting.id,
                  'rawImagesUrl',
                )}
              />
            }
          />
          <DetailRow
            label="Szerkesztő"
            value={
              <EditableComboboxField
                value={
                  editor ? { value: editor.id, label: editor.owner.name } : null
                }
                displayValue={
                  editor && (
                    <p>
                      {editor.nickname} ({' '}
                      <a
                        href={`tel:${editor.owner.phoneNumber}`}
                        className="text-blue-600 underline underline-offset-4 dark:text-blue-300"
                      >
                        {editor.owner.phoneNumber}
                      </a>{' '}
                      )
                    </p>
                  )
                }
                items={editorItems}
                placeholder="Válassz editort!"
                onSave={updatePhotoShootingField.bind(
                  null,
                  shooting.id,
                  'editorId',
                )}
              />
            }
          />
          <DetailRow
            label="Végleges képek (PicDrop URL)"
            fullWidth
            value={
              <EditableTextField
                value={finalImagesUrl}
                inputMode="url"
                displayValue={
                  finalImagesUrl && (
                    <a
                      href={finalImagesUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 underline underline-offset-4 dark:text-blue-300"
                    >
                      PicDrop
                      <ExternalLinkIcon className="size-4" />
                    </a>
                  )
                }
                onSave={updatePhotoShootingField.bind(
                  null,
                  shooting.id,
                  'finalImagesUrl',
                )}
              />
            }
          />
        </div>
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
                    {formatAmount(entry.amountInCents, entry.currency)} ·{' '}
                    {LEDGER_ENTRY_CATEGORY_LABEL[entry.category]}
                  </ItemTitle>
                  <ItemDescription>
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
