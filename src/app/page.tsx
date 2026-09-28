import { Booking } from '@/components/Booking';
import { BookingSelectionProvider } from '@/components/BookingSelectionProvider';
import { Faq } from '@/components/Faq';
import { FloatingAdminButton } from '@/components/FloatingAdminButton';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
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
      <main className="bg-forest font-sans text-cream">
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
      </main>
      <Footer />
      {session && <FloatingAdminButton />}
    </BookingSelectionProvider>
  );
}
