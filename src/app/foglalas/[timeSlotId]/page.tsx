import type { Metadata } from 'next';
import Link from 'next/link';

import { getTimeSlot } from '@/server/time-slots';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Foglalás · Karifoto',
};

export default async function BookingFormPage({
  params,
}: {
  params: Promise<{ timeSlotId: string }>;
}) {
  const { timeSlotId } = await params;
  const timeSlot = await getTimeSlot(timeSlotId);
  const isAvailable =
    timeSlot != null &&
    timeSlot.photoShooting == null &&
    timeSlot.startTime.getTime() > Date.now();

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

      {isAvailable ? (
        <section className="mx-auto max-w-130 px-4.5 pt-14 pb-10 sm:px-10">
          <p className="text-base leading-[1.6] font-light text-ink">
            Form comes here
          </p>
        </section>
      ) : (
        <section className="mx-auto max-w-130 px-4.5 pt-14 pb-10 text-center sm:px-10">
          <div className="eyebrow">Foglalás</div>
          <h1 className="mt-3.5 font-display text-[30px] leading-[1.1] font-medium text-pretty text-ink sm:text-[38px]">
            Ez az időpont már
            <br />
            nem elérhető
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
