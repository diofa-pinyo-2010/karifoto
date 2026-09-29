// import { useRouter } from 'next/navigation';
// import { useState, useTransition } from 'react';

import { BookingSelectionNote } from '@/components/BookingSelectionNote';
import { TimeSlotAccordion } from '@/components/TimeSlotAccordion';
import { GroupedSlots } from '@/lib/utils';

import type { TimeSlotPublic } from '@/lib/queries';

// import {
//   CircleCheckBigIcon,
//   PlusIcon,
//   SparkleIcon,
//   SparklesIcon,
// } from 'lucide-react';

// import { useAppContext } from '@/components/AppContextProvider';
// import { DaysAndTimes } from '@/components/DaysAndTimes';
// import { Step } from '@/components/Step';
// import { LIGHT_PLAY_FEE } from '@/lib/constants';
// import { packages } from '@/lib/data';
// import { shortFullDateFormatter } from '@/lib/formatters';
// import { cn, formatMoney, GroupedSlots } from '@/lib/utils';
// import { createBookingIntent } from '@/server/booking-intent';

export function Booking({
  groupedTimeSlots,
}: {
  groupedTimeSlots: GroupedSlots<TimeSlotPublic>;
}) {
  return (
    <section
      id="foglalas"
      className="brand-section bg-brand-cream bg-[radial-gradient(ellipse_at_0%_30%,#d5e1d947,transparent_50%)]"
    >
      <div className="brand-shell grid gap-9 sm:px-10 lg:grid-cols-[1fr_1.05fr] lg:gap-20 lg:px-12">
        <div>
          <p className="brand-eyebrow">Itt kezdődik a közös emlék</p>
          <h2 className="brand-heading">
            Legyen idén
            <br />
            <em>a ti karácsonyotok.</em>
          </h2>
          <p className="brand-intro">
            Válassz egy szabad időpontot, és lépj tovább a foglaláshoz. Mi már
            nagyon várunk benneteket!
          </p>

          {/* A lépések csak desktopon jelennek meg: mobilon a panel közvetlenül
              a szöveg alá kerül, ott a felsorolás csak távolabb tolná. */}
          <ol className="mt-7 hidden space-y-3 lg:block">
            {[
              'Válassz egy napot',
              'Kattints a szabad időpontra',
              'Folytasd a foglalást',
            ].map((step, i) => (
              <li key={step} className="flex items-center gap-3 text-xs">
                <span className="flex size-7 items-center justify-center rounded-full border border-brand-ink/20 text-[10px]">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>

          <p className="mt-8 text-xs leading-7 text-brand-muted">
            Elakadtál? Segítünk.
            <br />
            <a href="tel:+36301086063" className="font-semibold text-brand-ink">
              +36 30 108 6063 ↗
            </a>
          </p>
        </div>

        <div className="self-start overflow-hidden rounded-xl border border-[#cbd2c4] bg-brand-paper shadow-[0_12px_50px_#2a493408]">
          <div className="flex items-center justify-between gap-3 bg-brand-ink px-5 py-5 text-brand-cream">
            <span className="font-display text-2xl">Szabad időpontok</span>
            <span className="text-xs text-brand-champagne">2026</span>
          </div>
          <BookingSelectionNote />
          <div className="px-5">
            <TimeSlotAccordion groupedTimeSlots={groupedTimeSlots} />
          </div>
          <p className="px-5 py-4 text-[10px] leading-5 text-brand-muted">
            Az időpontokra kattintva tudod folytatni a foglalást.
          </p>
        </div>
      </div>
    </section>
  );
}

// function Form({ groupedTimeSlots }: { groupedTimeSlots: GroupedSlots }) {
//   const ctx = useAppContext();
//   const router = useRouter();
//   const [isPending, startTransition] = useTransition();
//   const [error, setError] = useState<string | null>(null);

//   const handleConfirm = () => {
//     if (!ctx.canConfirm || !ctx.selectedTimeSlotId) return;
//     setError(null);
//     startTransition(async () => {
//       const result = await createBookingIntent({
//         timeSlotId: ctx.selectedTimeSlotId!,
//         name: ctx.name,
//         email: ctx.email,
//         packageKey: ctx.selectedPackageKey,
//         decorSetKey: ctx.selectedDecorSetKey,
//         isLightPlaySelected: ctx.isLightPlaySelected,
//       });
//       if ('error' in result) {
//         setError(result.error);
//         return;
//       }
//       router.push(`/foglalas-veglegesitese/${result.id}`);
//     });
//   };

//   return (
//     <div className="mt-7 grid grid-cols-1 gap-6 rounded-[22px] bg-cream p-5 text-ink sm:mt-11 sm:p-8.5 lg:grid-cols-[1.35fr_1fr] lg:gap-8.5">
//       <div>
//         <DaysAndTimes groupedTimeSlots={groupedTimeSlots} />
//         <Step n={3} label="Csomag" className="mt-7" />
//         <div className="mt-3 flex flex-wrap gap-2.5">
//           {packages.map(({ id, name }) => (
//             <button
//               key={id}
//               type="button"
//               onClick={() => ctx.selectPackage(id)}
//               className={cn(
//                 'flex items-center gap-1 rounded-full border border-ink/20 py-3 pr-4.5 pl-3 text-sm text-ink transition-colors hover:border-ink/50',
//                 ctx.selectedPackageKey === id && 'border-ink bg-ink text-cream',
//               )}
//             >
//               {ctx.selectedPackageKey === id ? (
//                 <CircleCheckBigIcon className="size-4" />
//               ) : (
//                 <PlusIcon className="size-4" />
//               )}

//               {name}
//             </button>
//           ))}
//         </div>

//         <Step n={4} label="Díszlet" className="mt-7" />
//         <div className="mt-1.75 text-[13px] text-[#4A5F53]">
//           {ctx.bothDecorSets
//             ? `A ${ctx.selectedPackage.name} csomagban mindkét díszlettel fotózunk.`
//             : 'A Mini csomagban egy díszletet választhatsz.'}
//         </div>
//         <div className="mt-3 flex flex-wrap gap-2.5">
//           {ctx.decorSets.map(({ key, name, selected, disabled }) => {
//             return (
//               <button
//                 key={key}
//                 type="button"
//                 disabled={disabled}
//                 onClick={() => ctx.selectDecorSet(key)}
//                 className={cn(
//                   'flex items-center gap-1 rounded-full border border-ink/20 px-4.5 py-3 text-sm text-ink transition-colors hover:border-ink/50 disabled:cursor-not-allowed disabled:opacity-[.72]',
//                   selected && 'border-ink bg-ink text-cream',
//                 )}
//               >
//                 {selected ? (
//                   <CircleCheckBigIcon className="size-4" />
//                 ) : (
//                   <PlusIcon className="size-4" />
//                 )}
//                 {name}
//               </button>
//             );
//           })}
//         </div>

//         <div className="mt-3.5 border-t border-dashed border-ink/20 pt-4">
//           <div className="text-[11px] tracking-chip text-[#7B8C80] uppercase">
//             Extra
//           </div>
//           <button
//             type="button"
//             disabled={ctx.isLightPlayIncluded}
//             onClick={ctx.toggleLightPlay}
//             className={cn(
//               'mt-3 flex items-center gap-3.25 rounded-2xl border border-dashed border-ink/[.28] px-4.5 py-3.5 text-left text-ink transition-colors hover:border-ink/50 disabled:cursor-not-allowed disabled:opacity-[.72]',
//               ctx.isLightPlayOn && 'border-solid border-ink bg-ink text-cream',
//             )}
//           >
//             <span
//               className={cn(
//                 'inline-flex h-6 w-6 flex-none items-center justify-center rounded-full border border-ink/30 text-[13px]',
//                 ctx.isLightPlayOn && 'border-cream/40',
//               )}
//             >
//               {ctx.isLightPlayOn ? '✓' : '+'}
//             </span>
//             <span className="flex flex-col gap-0.75">
//               <span className="flex items-center gap-1 text-[15px] font-medium">
//                 <span>Fényjáték</span>
//                 <span className="rounded-full p-2">
//                   {ctx.isLightPlaySelected || ctx.isLightPlayIncluded ? (
//                     <SparklesIcon
//                       className="animate-pulse fill-gold stroke-white"
//                       strokeWidth={1}
//                     />
//                   ) : (
//                     <SparkleIcon />
//                   )}
//                 </span>
//               </span>
//               <span className="text-[12.5px] leading-[1.4] opacity-[.72]">
//                 {ctx.isLightPlayIncluded
//                   ? 'A Family csomag tartalmazza'
//                   : `+ ${formatMoney(LIGHT_PLAY_FEE)}`}
//               </span>
//             </span>
//           </button>
//         </div>
//       </div>

//       <div className="flex flex-col rounded-[18px] bg-ink p-5 text-[#F1E7D5] sm:p-6.5">
//         <div className="text-[11px] tracking-chip text-sage-dim uppercase">
//           Foglalás összegzése
//         </div>
//         <div className="mt-3 text-[28px] leading-tight text-cream-strong">
//           {ctx.selectedTimeSlot != null
//             ? `${shortFullDateFormatter.format(ctx.selectedTimeSlot.startTime)}`
//             : 'Válassz napot és idősávot'}
//         </div>
//         <div className="mt-2 text-sm text-sage-soft">
//           {ctx.selectedPackage.name} csomag · {ctx.selectedPackage.sub}
//         </div>
//         <div className="mt-1 text-sm text-gold">{ctx.decorSetLabel}</div>

//         <div className="mt-4.5 flex flex-col gap-1.75 border-t border-cream/[.14] pt-4">
//           <Row
//             label={`${ctx.selectedPackage.name} csomag`}
//             value={formatMoney(ctx.selectedPackage.priceHuf)}
//           />
//           <Row
//             label="Stúdió bérlet"
//             value={formatMoney(ctx.selectedPackage.studioFeeHuf)}
//           />
//           {ctx.isLightPlayIncluded ? (
//             <Row label="Fényjáték extra" value="a csomag része" />
//           ) : ctx.isLightPlayOn ? (
//             <Row label="Fényjáték extra" value={formatMoney(LIGHT_PLAY_FEE)} />
//           ) : null}
//           <div className="mt-1.5 flex items-baseline justify-between gap-3.5 border-t border-cream/[.14] pt-3">
//             <span className="text-sm text-[#F1E7D5]">Összesen</span>
//             <span className="font-display text-[28px] leading-none whitespace-nowrap text-gold">
//               {formatMoney(ctx.estimatedTotalAmount)}
//             </span>
//           </div>
//         </div>

//         <div className="mt-auto flex flex-col gap-2.5 pt-6">
//           <input
//             value={ctx.name}
//             onChange={(e) => ctx.setName(e.target.value)}
//             placeholder="Teljes neved"
//             autoComplete="name"
//             className="rounded-xl border border-cream/18 bg-forest px-3.75 py-3.5 text-[#F1E7D5] outline-none placeholder:text-sage-dim focus:border-gold"
//           />
//           <input
//             value={ctx.email}
//             onChange={(e) => ctx.setEmail(e.target.value)}
//             placeholder="E-mail címed"
//             type="email"
//             autoComplete="email"
//             className="rounded-xl border border-cream/18 bg-forest px-3.75 py-3.5 text-[#F1E7D5] outline-none placeholder:text-sage-dim focus:border-gold"
//           />
//         </div>

//         <button
//           type="button"
//           onClick={handleConfirm}
//           disabled={!ctx.canConfirm || isPending}
//           className={`mt-4.5 rounded-full px-5 py-4.5 text-base font-medium transition-colors ${
//             ctx.canConfirm && !isPending
//               ? 'bg-terracotta text-[#FFF4E6] hover:bg-terracotta-hover'
//               : 'cursor-not-allowed bg-cream/[.14] text-sage-dim'
//           }`}
//         >
//           {isPending
//             ? 'Foglalás létrehozása…'
//             : ctx.canConfirm
//               ? 'Tovább'
//               : !ctx.bothDecorSets && !ctx.selectedDecorSetKey
//                 ? 'Válassz díszletet!'
//                 : ctx.selectedTimeSlotId
//                   ? 'Add meg a neved és e-mailed'
//                   : 'Válassz idősávot'}
//         </button>

//         {error && (
//           <div className="mt-2.5 text-[13px] text-terracotta">{error}</div>
//         )}

//         <div className="mt-3 text-xs leading-normal text-sage-dim">
//           A következő oldalon még pár szükséges adatot elkérünk a foglaláshoz.
//         </div>
//       </div>
//     </div>
//   );
// }

// function Row({ label, value }: { label: string; value: string }) {
//   return (
//     <div className="flex justify-between gap-3.5 text-sm text-sage-soft">
//       <span>{label}</span>
//       <span className="whitespace-nowrap text-[#D8E2DA]">{value}</span>
//     </div>
//   );
// }
