import { Booking } from '@/components/Booking';
import { BookingSelectionProvider } from '@/components/BookingSelectionProvider';
import { Faq } from '@/components/Faq';
import { FloatingAdminButton } from '@/components/FloatingAdminButton';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { Location } from '@/components/Location';
import { MobileBookingBar } from '@/components/MobileBookingBar';
import { Pricing } from '@/components/Pricing';
import { Reviews } from '@/components/Reviews';
import { Sets } from '@/components/Sets';
import { Video } from '@/components/Video';
import { getSession } from '@/lib/dal';
import { fetchTimeSlotsPublic } from '@/lib/queries';
import { groupByDay } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [session, availableTimeSlots] = await Promise.all([
    getSession(),
    fetchTimeSlotsPublic(),
  ]);
  const groups = groupByDay(availableTimeSlots, (slot) => slot.startTime);

  return (
    <BookingSelectionProvider>
      <Header />
      {/*
        Nincs saját háttér vagy betűtípus: minden szekció maga állítja be. A
        korábbi `bg-forest font-sans text-cream` a régi arculatból maradt itt,
        és a krém szekciók mögé festett sötétzöldet.

        Az `id` a fejléc „Ugrás a tartalomra" linkjének és a lábléc „Vissza az
        elejére" hivatkozásának a célpontja.
      */}
      <main id="tartalom">
        {/*
          A Sets közvetlenül a Hero után jön, ahogy a látványtervben: a hero
          alját lezáró krém hullám ennek a szekciónak a háttérszínébe olvad
          (mindkettő #f5f1e9), így nincs látható él a kettő között.
        */}
        <Hero />
        <Sets />
        <Reviews />
        <Pricing />
        <Video />
        <Booking groupedTimeSlots={groups} />
        <Faq />
        <Location />
      </main>
      <Footer />
      <MobileBookingBar />
      {session && <FloatingAdminButton />}
    </BookingSelectionProvider>
  );
}
