import type { Metadata } from 'next';
import Link from 'next/link';

import { BookingIntentStatus } from '@/generated/prisma/enums';
import { packages } from '@/lib/data';
import { formatLongDate } from '@/lib/formatters';
import { getBookingIntent } from '@/server/booking-intent';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Sikeres foglalás · Karifoto',
};

const packageNameByEnum = Object.fromEntries(
  packages.map((p) => [p.id.toUpperCase(), p.name]),
);

export default async function SuccessPage(
  props: PageProps<'/success/[bookingIntentId]'>,
) {
  const { bookingIntentId } = await props.params;
  const bookingIntent = await getBookingIntent(bookingIntentId);

  // A webhook konvertálja a foglalást — amíg fut, a státusz még PENDING.
  const isConverted =
    bookingIntent?.status === BookingIntentStatus.CONVERTED ||
    bookingIntent?.status === BookingIntentStatus.PAYMENT_ORPHANED;
  const isProcessing = bookingIntent?.status === BookingIntentStatus.PENDING;

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-40 flex items-center gap-3.5 border-b border-ink/12 bg-cream/94 px-4.5 py-4 backdrop-blur-[10px] sm:px-10">
        <Link href="/" className="text-ink transition-opacity hover:opacity-75">
          <Image
            src="/images/karifoto-logo-terrakotta.png"
            alt="Karifoto"
            width={353}
            height={146}
            priority
            className="h-7 w-auto lg:h-10"
          />
        </Link>
      </header>

      <section className="mx-auto max-w-130 px-4.5 pt-14 pb-10 text-center sm:px-10">
        <div className="eyebrow">Visszaigazolás</div>

        {bookingIntent == null ? (
          <>
            <h1 className="mt-3.5 font-display text-[30px] leading-[1.1] font-medium text-pretty text-ink sm:text-[38px]">
              Ezt a foglalást
              <br />
              nem találjuk
            </h1>
            <p className="mx-auto mt-3.5 max-w-100 text-base leading-[1.6] font-light text-pretty text-cream-muted">
              Ha kifizetted a foglalót, a visszaigazolást e-mailben megkapod.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-3.5 font-display text-[30px] leading-[1.1] font-medium text-pretty text-ink sm:text-[38px]">
              {isProcessing
                ? 'A foglalás feldolgozás alatt van…'
                : 'Sikeres foglalás!'}
            </h1>
            <p className="mx-auto mt-3.5 max-w-100 text-base leading-[1.6] font-light text-pretty text-cream-muted">
              {isProcessing
                ? 'A fizetés megtörtént, a visszaigazolás pár másodpercen belül megérkezik. Frissítsd az oldalt.'
                : `Kedves ${bookingIntent.name}! Köszönjük a foglalást! A visszaigazolást elküldtük e-mailben is.`}
            </p>

            <dl className="mx-auto mt-7 max-w-100 rounded-2xl border border-ink/15 bg-[#FFFDF8] px-5 py-1.5 text-left">
              <SuccessRow
                label="Időpont"
                value={formatLongDate(bookingIntent.timeSlot.startTime)}
              />
              <SuccessRow
                label="Csomag"
                value={
                  packageNameByEnum[bookingIntent.package] ??
                  bookingIntent.package
                }
              />
              <SuccessRow
                label="Létszám"
                value={`${bookingIntent.numberOfGuests} fő`}
              />
              <SuccessRow label="Visszaigazolás" value={bookingIntent.email} />
            </dl>

            {isConverted && (
              <p className="mx-auto mt-4 max-w-100 text-[13px] leading-[1.6] text-pretty text-cream-dim">
                A végleges összeget a fotózás napján, a stúdióban fizetitek — a
                foglaló ebből levonásra kerül.
              </p>
            )}
          </>
        )}

        <Link
          href="/"
          className="mt-7 inline-block rounded-full bg-terracotta px-6 py-3.5 text-base font-medium text-[#FFF4E6] transition-colors hover:bg-terracotta-hover"
        >
          Vissza a főoldalra
        </Link>
      </section>
    </div>
  );
}

function SuccessRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6 border-b border-ink/10 py-3 last:border-b-0">
      <dt className="text-[14.5px] text-cream-muted">{label}</dt>
      <dd className="text-right text-[14.5px] break-all text-ink">{value}</dd>
    </div>
  );
}
