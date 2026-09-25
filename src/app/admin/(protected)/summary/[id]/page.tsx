import { CheckCircle2Icon } from 'lucide-react';

import { AddPriceAdjustmentDialog } from '@/components/AddPriceAdjustmentDialog';
import { DeletePriceAdjustmentButton } from '@/components/DeletePriceAdjustmentButton';
import { SendDepositRequestButton } from '@/components/SendDepositRequestButton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DECOR_SET_LABEL, PACKAGE_LABEL } from '@/lib/constants';
import { shortFullDateFormatter } from '@/lib/formatters';
import { wasEmailSent } from '@/lib/idempotency';
import { formatMoney } from '@/lib/utils';
import { getBookingIntent } from '@/server/booking-intent';

export default async function RemoteBookingSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [bookingIntent, alreadySent] = await Promise.all([
    getBookingIntent(id),
    wasEmailSent(id),
  ]);

  if (bookingIntent == null) {
    return (
      <div className="mx-auto flex w-full flex-col gap-6 lg:w-3xl">
        <h1 className="text-lg font-semibold text-muted-foreground lg:text-2xl">
          Összegzés
        </h1>
        <p className="text-muted-foreground">Ez a foglalás nem található.</p>
      </div>
    );
  }

  const isBookingIntentConverted = bookingIntent.status === 'CONVERTED';

  return (
    <div className="mx-auto flex w-full flex-col gap-6 pb-24 lg:w-3xl">
      <h1 className="text-lg font-semibold text-muted-foreground lg:text-2xl">
        Összegzés
      </h1>

      <div className="rounded-lg border px-4">
        <SummaryRow
          label="Időpont"
          value={shortFullDateFormatter.format(
            // The shooting may have been rescheduled — show its current time.
            // The bi holds the original date intentionally
            bookingIntent.photoShooting?.timeSlot.startTime ??
              bookingIntent.timeSlot.startTime,
          )}
        />
        <SummaryRow label="Név" value={bookingIntent.name} />
        <SummaryRow label="E-mail cím" value={bookingIntent.email} />
        <SummaryRow
          label="Csomag"
          value={PACKAGE_LABEL[bookingIntent.package]}
        />
        <SummaryRow
          label="Díszlet"
          value={
            bookingIntent.decorSet
              ? DECOR_SET_LABEL[bookingIntent.decorSet]
              : 'Mindkettő'
          }
        />
        <SummaryRow
          label="Fényjáték"
          value={bookingIntent.isLightPlaySelected ? 'Igen' : 'Nem'}
        />
        <SummaryRow
          label="Vendégek száma"
          value={String(bookingIntent.numberOfGuests)}
        />
        <SummaryRow
          label="Kisállatok száma"
          value={String(bookingIntent.numberOfPets)}
        />
        <SummaryRow
          label="Megjegyzés"
          value={bookingIntent.clientNote ?? '—'}
        />
      </div>

      {bookingIntent.adjustments.length > 0 && (
        <div className="rounded-lg border px-4">
          {bookingIntent.adjustments.map((adjustment) => (
            <div
              key={adjustment.id}
              className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0"
            >
              <span className="text-sm text-muted-foreground">
                {adjustment.reason}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-right text-sm font-medium">
                  - {formatMoney(adjustment.amountInCents)}
                </span>
                <DeletePriceAdjustmentButton
                  priceAdjustmentId={adjustment.id}
                  bookingIntentId={id}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <AddPriceAdjustmentDialog
        bookingIntentId={id}
        disabled={isBookingIntentConverted}
      />

      {isBookingIntentConverted && (
        <Alert>
          <CheckCircle2Icon />
          <AlertTitle>Előleg befizetve!</AlertTitle>
          <AlertDescription>
            Ezt az egyenlegbekérőt már kifizették.
          </AlertDescription>
        </Alert>
      )}

      <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <SendDepositRequestButton
          bookingIntentId={id}
          initiallySent={alreadySent}
          isBookingIntentConverted={isBookingIntentConverted}
        />
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}
