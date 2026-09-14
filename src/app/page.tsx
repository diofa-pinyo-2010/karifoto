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
import { groupSlotsByDay } from '@/lib/utils';
import { fetchTimeSlots } from '@/server/time-slots';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [session, availableTimeSlots] = await Promise.all([
    getSession(),
    fetchTimeSlots(),
  ]);
  const groups = groupSlotsByDay(availableTimeSlots);

  return (
    <BookingSelectionProvider>
      <Header />
      <main className="bg-forest font-sans text-cream">
        <Hero />
        <Reviews />
        <Pricing />
        <Sets />
        <Video />
        <Booking groupedTimeSlots={groups} />
        <Faq />
      </main>
      <Footer />
      {session && <FloatingAdminButton />}
    </BookingSelectionProvider>
  );
}
