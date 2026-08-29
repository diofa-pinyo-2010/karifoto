import { Booking } from '@/components/Booking';
import { BookingProvider } from '@/components/BookingProvider';
import { Faq } from '@/components/Faq';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { Pricing } from '@/components/Pricing';
import { Reviews } from '@/components/Reviews';
import { Sets } from '@/components/Sets';
// import { StickyCta } from '@/components/StickyCta';
import { Video } from '@/components/Video';

export default function Home() {
  return (
    <BookingProvider>
      <Header />
      <main className="bg-forest font-sans text-cream">
        <Hero />
        <Reviews />
        <Pricing />
        <Sets />
        <Video />
        <Booking />
        <Faq />
      </main>
      <Footer />
      {/* <StickyCta /> */}
    </BookingProvider>
  );
}
