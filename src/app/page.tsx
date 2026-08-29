import { AppProvider } from '@/components/AppContextProvider';
import { Booking } from '@/components/Booking';
import { Faq } from '@/components/Faq';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { Pricing } from '@/components/Pricing';
import { Reviews } from '@/components/Reviews';
import { Sets } from '@/components/Sets';
// import { StickyCta } from '@/components/StickyCta';
import { Video } from '@/components/Video';
import { groupSlotsByDay } from '@/lib/utils';
import { fetchTimeSlots } from '@/server/time-slots';

export default async function Home() {
  const availableTimeSlots = await fetchTimeSlots();
  const groups = groupSlotsByDay(availableTimeSlots);

  return (
    <AppProvider availableTimeSlotsGrouped={groups}>
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
      {/* <StickyCta /> */}
    </AppProvider>
  );
}
