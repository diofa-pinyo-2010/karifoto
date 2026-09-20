import { CheckCircle2Icon } from 'lucide-react';

import { SendDepositRequestButton } from '@/components/SendDepositRequestButton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DecorSet, Package } from '@/generated/prisma/client';
import { packages, photoShootingSets, type PackageKey } from '@/lib/data';
import { shortFullDateFormatter } from '@/lib/formatters';
import { wasEmailSent } from '@/lib/idempotency';
import { getBookingIntent } from '@/server/booking-intent';

const packageNameById = Object.fromEntries(
  packages.map((p) => [p.id, p.name]),
) as Record<PackageKey, string>;

const PACKAGE_LABEL: Record<Package, string> = {
  [Package.MINI]: packageNameById.mini,
  [Package.CLASSIC]: packageNameById.classic,
  [Package.FAMILY]: packageNameById.family,
};

const DECOR_SET_LABEL: Record<DecorSet, string> = {
  [DecorSet.HOFEHER]: photoShootingSets.hofeher.name,
  [DecorSet.ALOMKASTELY]: photoShootingSets.alomkastely.name,
};

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
