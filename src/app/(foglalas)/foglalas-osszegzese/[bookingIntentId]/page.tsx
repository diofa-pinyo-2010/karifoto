import type { Metadata } from 'next';

import { BookingReview } from '@/components/BookingReview';
import { BookingUnavailable } from '@/components/BookingUnavailable';
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
    bookingIntent.timeSlot.photoShooting == null &&
    bookingIntent.timeSlot.startTime.getTime() > Date.now();

  if (!isBookable) {
    return (
      <BookingUnavailable
        title={
          <>
            Ez a foglalás nem elérhető,
            <br />
            vagy az időpont már elkelt
          </>
        }
      />
    );
  }

  return <BookingReview bookingIntent={bookingIntent} />;
}
