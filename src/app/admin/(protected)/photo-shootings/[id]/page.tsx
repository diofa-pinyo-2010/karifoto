import { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';

import {
  ArrowLeft,
  ArrowRightIcon,
  ExternalLinkIcon,
  UserIcon,
} from 'lucide-react';

import { AddPriceAdjustmentDialog } from '@/components/AddPriceAdjustmentDialog';
import { AdjustmentNoteTooltip } from '@/components/AdjustmentNoteTooltip';
import { BalancePayment } from '@/components/BalancePayment';
import { ChangeStartTimeButton } from '@/components/ChangeStartTimeButton';
import { DeletePriceAdjustmentButton } from '@/components/DeletePriceAdjustmentButton';
import { DetailRow } from '@/components/DetailRow';
import { EditableComboboxField } from '@/components/EditableComboboxField';
import { EditableTextField } from '@/components/EditableTextField';
import { ExternalLinkItem } from '@/components/ExternalLinkItem';
import { RefreshStatusButton } from '@/components/RefreshStatusButton';
import { SendRawImages } from '@/components/SendRawImages';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ItemGroup } from '@/components/ui/item';
import { Separator } from '@/components/ui/separator';
import { PhotoShootingStatus } from '@/generated/prisma/enums';
import {
  APP_URLS,
  booleanToYesNo,
  DECOR_SET_COMBOBOX_ITEMS,
  DECOR_SET_LABEL,
  isLightPlayChargeable,
  LEDGER_ENTRY_CATEGORY_LABEL,
  PACKAGE_LABEL,
  PAYMENT_METHOD_LABEL,
  PHOTO_SHOOTING_STATUS_BADGE_CLASSNAME,
  PHOTO_SHOOTING_STATUS_LABEL,
  YES_NO_COMBOBOX_ITEMS,
} from '@/lib/constants';
import {
  dateFormatter,
  shortFullDateFormatter,
  timeFormatter,
} from '@/lib/formatters';
import { getPhotoShooting } from '@/lib/queries';
import { resendEmailUrl } from '@/lib/resend';
import { capitalize, cn, formatAmount } from '@/lib/utils';
import {
  fetchPhotographers,
  fetchEditors,
  recalculatePhotoShootingStatus,
  updatePhotoShootingField,
} from '@/server/admin';
import { calculatePricing } from '@/server/pricing';

// Dedupes the query between generateMetadata and the page within one request
const getCachedPhotoShooting = cache(getPhotoShooting);

export async function generateMetadata({
  params,
}: PageProps<'/admin/photo-shootings/[id]'>): Promise<Metadata> {
  const { id } = await params;
  const shooting = await getCachedPhotoShooting(id);

  return {
    title: `${shooting?.client.owner.name ?? 'Fotózás'}`,
  };
}

export default async function PhotoShootingDetailPage({
  params,
}: PageProps<'/admin/photo-shootings/[id]'>) {
  const { id } = await params;
  const shooting = await getCachedPhotoShooting(id);
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
      render={<Link href={APP_URLS.upcomingShootings} />}
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
    sentEmails,
    status,
    totalEditedImages,
    totalRetouchedImages,
  } = shooting;

  const priceBreakdown = calculatePricing({
    pricing,
    shooting,
    adjustments,
    ledgerEntries,
  });

  /**
   * After balance is collected we don't want to be able
   * to edit the photo shooting details.
   */
  const readOnlyDetails =
    (shooting.selectionRequestedAt != null &&
      shooting.selectionCompletedAt == null) ||
    status === PhotoShootingStatus.CANCELLED;

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
        <h1 className="text-3xl font-semibold lg:text-4xl">
          {client.owner.name}
        </h1>
        <div className="item-center flex flex-col gap-2 lg:flex-row">
          <h2 className="text-lg font-medium text-muted-foreground lg:text-2xl">
            {capitalize(dateFormatter.format(timeSlot.startTime))} •{' '}
            {timeFormatter.format(timeSlot.startTime)}
          </h2>
          <ChangeStartTimeButton
            currentStartTime={timeSlot.startTime}
            shootingId={shooting.id}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {/* <h3 className="text-lg font-medium">Ügyfél</h3> */}
        <Button
          variant="secondary"
          className="self-start uppercase"
          size="lg"
          render={
            <Link
              href={APP_URLS.clientPortalShootingDetails(
                client.id,
                shooting.id,
              )}
            />
          }
          nativeButton={false}
        >
          <UserIcon />
          Ügyfélportál
          <ArrowRightIcon />
        </Button>
        <div className="rounded-lg border bg-card px-4">
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
        <h3 className="text-lg font-medium">A csapat</h3>
        <div className="rounded-lg border bg-card px-4">
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
        </div>
      </div>
      <Separator />

      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-medium">A fotózás részletei</h3>
        <div className="rounded-lg border bg-card px-4">
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
                disabled={shooting.package !== 'MINI' || readOnlyDetails}
              />
            }
          />
          <DetailRow
            label="Fényjáték extraként választva"
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
                disabled={
                  !isLightPlayChargeable(shooting.package) || readOnlyDetails
                }
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
                disabled={readOnlyDetails}
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
                disabled={readOnlyDetails}
              />
            }
          />
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-medium">A fotózás napja & fizettetés</h3>
        <div className="rounded-lg border bg-card px-4">
          {/*
            Every row comes from calculatePricing, so what is listed here always
            sums to what it charges. Deriving these rows separately is what let
            the light-play row show a fee the total did not include, and left
            extra edited/retouched images off the list entirely.
          */}
          {priceBreakdown.lines.map((line) => {
            const adjustment = line.adjustmentId
              ? adjustments.find((adj) => adj.id === line.adjustmentId)
              : undefined;

            return (
              <DetailRow
                key={line.adjustmentId ?? line.label}
                label={
                  adjustment ? (
                    <span className="flex items-center gap-1">
                      {line.label}
                      <AdjustmentNoteTooltip
                        note={adjustment.internalNote}
                        nickname={adjustment.createdBy.nickname}
                      />
                    </span>
                  ) : (
                    line.label
                  )
                }
                value={
                  adjustment ? (
                    <span className="flex items-center justify-end gap-3">
                      {formatAmount(line.amountInCents, 'HUF')}
                      <DeletePriceAdjustmentButton
                        priceAdjustmentId={adjustment.id}
                        target={{ photoShootingId: shooting.id }}
                        disabled={readOnlyDetails}
                      />
                    </span>
                  ) : (
                    formatAmount(line.amountInCents, 'HUF')
                  )
                }
              />
            );
          })}
        </div>
        <div className="rounded-lg border bg-accent px-4 text-accent-foreground">
          <DetailRow
            label="ÖSSZESEN"
            value={formatAmount(priceBreakdown.totalToBeInvoiced, 'HUF')}
          />
        </div>
        <AddPriceAdjustmentDialog
          title="Fizetés eltérés hozzáadása"
          triggerLabel="Fizetés eltérés"
          defaultType="DEDUCTION"
          target={{ photoShootingId: shooting.id }}
          disabled={readOnlyDetails}
        />
        <div className="mt-4 rounded-lg border bg-card px-4">
          {ledgerEntries.map((ledgerEntry) => {
            return (
              <DetailRow
                key={ledgerEntry.id}
                label={`${LEDGER_ENTRY_CATEGORY_LABEL[ledgerEntry.category]} (${PAYMENT_METHOD_LABEL[ledgerEntry.method]})`}
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
        <BalancePayment
          remainingAmount={priceBreakdown.totalToBePaid}
          currentShootingStatus={shooting.status}
          shootingId={shooting.id}
        />
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-medium">Utómunka</h3>
        <div className="rounded-lg border bg-card px-4">
          <DetailRow
            label="Nyers képek (PicDrop URL)"
            fullWidth
            value={
              <EditableTextField
                value={rawImagesUrl}
                placeholder="https://www.picdrop.com..."
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
          <SendRawImages
            id={shooting.id}
            selectionRequestedAt={shooting.selectionRequestedAt}
            rawImagesUrl={shooting.rawImagesUrl}
            status={shooting.status}
          />
        </div>
        <div className="rounded-lg border bg-card px-4">
          <DetailRow
            label="Megszerkesztett képek"
            value={
              <EditableTextField
                type="number"
                inputMode="numeric"
                value={String(totalEditedImages)}
                onSave={updatePhotoShootingField.bind(
                  null,
                  shooting.id,
                  'totalEditedImages',
                )}
              />
            }
          />
          <DetailRow
            label="Beauty retus"
            value={
              <EditableTextField
                type="number"
                inputMode="numeric"
                value={String(totalRetouchedImages)}
                onSave={updatePhotoShootingField.bind(
                  null,
                  shooting.id,
                  'totalRetouchedImages',
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
                placeholder="https://www.picdrop.com..."
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
              <ExternalLinkItem
                key={entry.id}
                title={`${formatAmount(entry.amountInCents, entry.currency)} · ${LEDGER_ENTRY_CATEGORY_LABEL[entry.category]}`}
                description={PAYMENT_METHOD_LABEL[entry.method]}
                href={entry.invoice?.publicUrl}
                linkLabel="Számla"
              />
            ))}
          </ItemGroup>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Elküldött email-ek</h2>
        {sentEmails.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nincsenek még elküldött email-ek.
          </p>
        ) : (
          <ItemGroup>
            {sentEmails.map((email) => (
              <ExternalLinkItem
                key={email.id}
                title={shortFullDateFormatter.format(email.sentAt)}
                description={email.subject}
                href={resendEmailUrl(email.resendId)}
                linkLabel="Resend"
              />
            ))}
          </ItemGroup>
        )}
      </div>
    </div>
  );
}
