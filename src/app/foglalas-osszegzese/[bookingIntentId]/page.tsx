import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { BookingReview } from '@/components/BookingReview';
import { BookingIntentStatus } from '@/generated/prisma/enums';
import { getBookingIntent } from '@/server/booking-intent';

export const metadata: Metadata = {
  title: 'Összegzés · Karifoto',
};

export default async function BookingSummaryPage(
  props: PageProps<'/foglalas-osszegzese/[bookingIntentId]'>,
) {
  const { bookingIntentId } = await props.params;
  const bookingIntent = await getBookingIntent(bookingIntentId);

  // Ugyanaz a szabály, mint a createCheckoutSession-ben, hogy ne mutassunk
  // fizethető összegzést olyan idősávra, amit az action utána visszautasítana.
  const isBookable =
    bookingIntent != null &&
    bookingIntent.status === BookingIntentStatus.PENDING &&
    bookingIntent.timeSlot.revealed &&
    bookingIntent.timeSlot.photoShooting == null &&
    bookingIntent.timeSlot.startTime.getTime() > Date.now();

  return (
    <div className="min-h-screen bg-cream pb-33">
      <header className="sticky top-0 z-40 flex items-center gap-3.5 border-b border-ink/12 bg-cream/94 px-4.5 py-4 backdrop-blur-[10px] sm:px-10">
        <Link
          href="/"
          className="mr-auto text-cream transition-opacity hover:opacity-85"
        >
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

      {isBookable ? (
        <BookingReview bookingIntent={bookingIntent} />
      ) : (
        <section className="mx-auto max-w-130 px-4.5 pt-14 pb-10 text-center sm:px-10">
          <div className="eyebrow">Foglalás</div>
          <h1 className="mt-3.5 font-display text-[30px] leading-[1.1] font-medium text-pretty text-ink sm:text-[38px]">
            Ez a foglalás nem elérhető,
            <br />
            vagy az időpont már elkelt
          </h1>
          <p className="mx-auto mt-3.5 max-w-100 text-base leading-[1.6] font-light text-pretty text-cream-muted">
            Válassz másik időpontot a főoldalon.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-full bg-terracotta px-6 py-3.5 text-base font-medium text-[#FFF4E6] transition-colors hover:bg-terracotta-hover"
          >
            Vissza a főoldalra
          </Link>
        </section>
      )}
    </div>
  );
}
