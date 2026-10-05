import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { BookingIntentStatus } from '@/generated/prisma/enums';
import { PACKAGES } from '@/lib/catalog';
import { formatLongDate } from '@/lib/formatters';
import { getBookingIntentPublic } from '@/lib/queries';

export const metadata: Metadata = {
  title: 'Sikeres foglalás · Karifoto',
};

export default async function SuccessPage(
  props: PageProps<'/success/[bookingIntentId]'>,
) {
  const { bookingIntentId } = await props.params;
  const bookingIntent = await getBookingIntentPublic(bookingIntentId);

  // A webhook konvertálja a foglalást — amíg fut, a státusz még PENDING.
  const isConverted =
    bookingIntent?.status === BookingIntentStatus.CONVERTED ||
    bookingIntent?.status === BookingIntentStatus.PAYMENT_ORPHANED;
  const isProcessing = bookingIntent?.status === BookingIntentStatus.PENDING;

  return (
    <div className="min-h-screen bg-brand-cream font-brand-sans text-brand-ink">
      <header className="bg-[#102a31] py-4.5 text-brand-cream">
        <div className="brand-shell flex items-center justify-between gap-5">
          <Link href="/" aria-label="Karifoto – kezdőlap">
            <Image
              src="/images/karifoto-logo-krem.png"
              alt="Karifoto"
              width={353}
              height={146}
              priority
              className="h-7 w-auto lg:h-9"
            />
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-180 px-6 pt-14 pb-20 text-center sm:px-10">
        <p className="brand-eyebrow">Visszaigazolás</p>

        {bookingIntent == null ? (
          <>
            <h1 className="font-display text-[clamp(30px,5vw,44px)] leading-[1.07] font-medium text-pretty">
              Ezt a foglalást
              <br />
              nem találjuk
            </h1>
            <p className="mx-auto mt-5 max-w-125 text-[15px] leading-[1.85] text-pretty text-brand-muted">
              Ha kifizetted az előleget, a visszaigazolást e-mailben megkapod.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-[clamp(30px,5vw,44px)] leading-[1.07] font-medium text-pretty">
              {isProcessing
                ? 'A foglalás feldolgozás alatt van…'
                : 'Sikeres foglalás!'}
            </h1>
            <p className="mx-auto mt-5 max-w-125 text-[15px] leading-[1.85] text-pretty text-brand-muted">
              {isProcessing
                ? 'A fizetés megtörtént, a visszaigazolás pár másodpercen belül megérkezik. Frissítsd az oldalt.'
                : `Kedves ${bookingIntent.name}! Köszönjük a foglalást! A visszaigazolást elküldtük e-mailben is.`}
            </p>

            <dl className="mx-auto mt-7 max-w-125 rounded-2xl border border-[#d9d3c7] bg-brand-paper px-5 py-1.5 text-left">
              <SuccessRow
                label="Időpont"
                value={formatLongDate(
                  // A fotózás időpontja átkerülhetett — azt mutatjuk.
                  bookingIntent.photoShooting?.timeSlot.startTime ??
                    bookingIntent.requestedStartTime,
                )}
              />
              <SuccessRow
                label="Csomag"
                value={PACKAGES[bookingIntent.package].label}
              />
              <SuccessRow
                label="Létszám"
                value={`${bookingIntent.numberOfGuests} fő`}
              />
              <SuccessRow label="Visszaigazolás" value={bookingIntent.email} />
            </dl>

            {isConverted && (
              <p className="mx-auto mt-4 max-w-125 text-[13px] leading-[1.6] text-pretty text-brand-muted">
                A végleges összeget a fotózás napján, a stúdióban fizetitek — a
                foglaló ebből levonásra kerül.
              </p>
            )}
          </>
        )}

        <Link
          href="/"
          className="mt-7 inline-flex min-h-13 items-center justify-center rounded-lg bg-brand-champagne px-6 py-3.5 text-sm font-semibold text-[#152b2e] transition-opacity hover:opacity-90"
        >
          Vissza a főoldalra
        </Link>
      </section>
    </div>
  );
}

function SuccessRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6 border-b border-[#d9d3c7] py-3 last:border-b-0">
      <dt className="text-[14.5px] text-brand-muted">{label}</dt>
      <dd className="text-right text-[14.5px] break-all">{value}</dd>
    </div>
  );
}
