import {
  LedgerEntry,
  PhotoShooting,
  PhotoShootingPricing,
  PriceAdjustment,
} from '@/generated/prisma/client';
import {
  isLightPlayChargeable,
  PRICE_ADJUSTMENT_TYPE_SIGN,
} from '@/lib/constants';

/**
 * One row of a bill. The sign is carried in the amount: charges are positive,
 * adjustments negative, so `lines` always sums to `totalToBeInvoiced`. When
 * `SURCHARGE` lands, an adjustment that *increases* the bill is simply a
 * positive amount and nothing else has to change.
 */
export type PriceLine = {
  label: string;
  amountInCents: number;
  /**
   * Set when the line came from a `PriceAdjustment`. The admin page uses it to
   * find the adjustment behind a row, so it can show the internal note and a
   * delete button on that row only. An invoice ignores it.
   */
  adjustmentId?: string;
};

export type PriceBreakdown = {
  /** Charges first, then adjustments. Sums to `totalToBeInvoiced`. */
  lines: PriceLine[];
  totalCharges: number;
  /** Signed: negative for discounts and deductions. */
  totalAdjustments: number;
  totalPaid: number;
  /**
   * The full price of the shooting. A végszámla lists this, and then deducts
   * the advance it settles as a separate negative line — szamlazz does that
   * arithmetic for nobody, so the document's own total is what must come out
   * right. See [`buildFinalInvoiceItems()`](../lib/invoice/final-invoice-items.ts).
   */
  totalToBeInvoiced: number;
  /** What the client still hands over at the till. */
  totalToBePaid: number;
};

type PricingArgs = {
  pricing: PhotoShootingPricing;
  shooting: PhotoShooting;
  adjustments: PriceAdjustment[];
  ledgerEntries: LedgerEntry[];
};

/**
 * The one place that turns a shooting plus its price snapshot into a bill.
 *
 * It returns the individual lines rather than a single total because three
 * callers need the same breakdown — the admin pricing rows, a végszámla's line
 * items, and the SumUp payment amount. Deriving those separately is what let
 * the admin page show a light-play charge the total did not include.
 *
 * A line is only present when it costs something, so nothing renders or
 * invoices a 0 Ft row — except the package and studio fee, which always apply.
 */
export function calculatePricing({
  pricing,
  shooting,
  adjustments,
  ledgerEntries,
}: PricingArgs): PriceBreakdown {
  const lines: PriceLine[] = [
    {
      label: `${shooting.package} csomag`,
      amountInCents: pricing.packagePriceInCents,
    },
    {
      label: 'Stúdió bérlés',
      amountInCents: pricing.packageStudioPriceInCents,
    },
  ];

  if (isLightPlayChargeable(shooting.package) && shooting.isLightPlaySelected) {
    lines.push({
      label: '✨ Fényjáték',
      amountInCents: pricing.lightPlayPriceInCents,
    });
  }

  const extraPeople = Math.max(
    0,
    shooting.numberOfGuests - pricing.extraPeopleThreshold,
  );
  if (extraPeople > 0) {
    lines.push({
      label: `Extra személyek (${extraPeople})`,
      amountInCents: extraPeople * pricing.extraPeopleRateInCents,
    });
  }

  if (shooting.numberOfPets > 0) {
    lines.push({
      label: `🐶 Kis kedvencek (${shooting.numberOfPets})`,
      amountInCents: shooting.numberOfPets * pricing.extraPetRateInCents,
    });
  }

  const extraEdited = Math.max(
    0,
    shooting.totalEditedImages - pricing.packageEditedImagesAllowance,
  );
  if (extraEdited > 0) {
    lines.push({
      label: `Extra szerkesztett képek (${extraEdited})`,
      amountInCents: extraEdited * pricing.extraEditedImageRateInCents,
    });
  }

  // Deliberately not clamped, unlike the edited-image term above. See the
  // "negative-number hole" section of src/docs/image-selection.md: the guard
  // belongs in the form that accepts the count, not here, because this function
  // is also the price preview and must report what is stored.
  if (shooting.totalRetouchedImages !== 0) {
    lines.push({
      label: `Retusált képek (${shooting.totalRetouchedImages})`,
      amountInCents:
        shooting.totalRetouchedImages * pricing.extraRetouchedImageRateInCents,
    });
  }

  const totalCharges = lines.reduce((sum, line) => sum + line.amountInCents, 0);

  // Every adjustment currently reduces the bill; `amountInCents` is stored as a
  // positive magnitude, so the sign is applied here. Adding `SURCHARGE` means
  // replacing this negation with a per-type sign map.
  // Note: replaced with a per-type sign map.
  const adjustmentLines: PriceLine[] = adjustments.map((adjustment) => ({
    label: adjustment.publicLabel,
    amountInCents:
      PRICE_ADJUSTMENT_TYPE_SIGN[adjustment.type] * adjustment.amountInCents,
    adjustmentId: adjustment.id,
  }));

  const totalAdjustments = adjustmentLines.reduce(
    (sum, line) => sum + line.amountInCents,
    0,
  );

  const totalPaid = ledgerEntries
    .filter((entry) => entry.category.startsWith('INCOME'))
    .reduce((sum, entry) => sum + entry.amountInCents, 0);

  const totalToBeInvoiced = totalCharges + totalAdjustments;

  return {
    lines: [...lines, ...adjustmentLines],
    totalCharges,
    totalAdjustments,
    totalPaid,
    totalToBeInvoiced,
    totalToBePaid: totalToBeInvoiced - totalPaid,
  };
}

/**
 * The amount a booking's Purchase is reported to the ad platforms with: the
 * full price of the shooting, not the deposit. The success page's
 * `booking_completed` event and the webhook's Meta Conversions API event both
 * call this on the shooting `getCreatedShooting()` returns, so the browser and
 * server Purchase carry the same value and Meta can merge them.
 */
export function bookingPurchaseTotalInCents(
  shooting: PhotoShooting & {
    pricing: PhotoShootingPricing;
    adjustments: PriceAdjustment[];
    ledgerEntries: LedgerEntry[];
  },
): number {
  return calculatePricing({
    pricing: shooting.pricing,
    shooting,
    adjustments: shooting.adjustments,
    ledgerEntries: shooting.ledgerEntries,
  }).totalToBeInvoiced;
}
