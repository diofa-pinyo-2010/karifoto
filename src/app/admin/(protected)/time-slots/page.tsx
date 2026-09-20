import Link from 'next/link';

import { RevealedSwitch } from '@/components/RevealedSwitch';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item';
import { formatLongDate, timeFormatter } from '@/lib/formatters';
import { groupByDay } from '@/lib/utils';
import { fetchTimeSlots } from '@/server/time-slots';

export default async function AdminTimeSlotsPage() {
  const timeSlots = await fetchTimeSlots();
  const groupedDays = groupByDay(timeSlots, (slot) => slot.startTime);
  const days = Array.from(groupedDays.entries());

  return (
    <div className="mx-auto flex w-full flex-col gap-6 lg:w-3xl">
      <h1 className="text-lg font-semibold text-muted-foreground lg:text-2xl">
        Idősávok
      </h1>
      <Accordion multiple={false} defaultValue={[days[0][0]]}>
        {days.map(([dayKey, slots]) => {
          return (
            <AccordionItem key={dayKey} value={dayKey}>
              <AccordionTrigger className="text-lg">
                {formatLongDate(slots[0].startTime)}
              </AccordionTrigger>
              <AccordionContent>
                <ul className="flex flex-col gap-3">
                  {slots.map(({ id, revealed, startTime, photoShooting }) => {
                    return (
                      <li key={id}>
                        <Item variant="outline">
                          <ItemContent>
                            <ItemTitle>
                              {timeFormatter.format(startTime)}
                            </ItemTitle>
                            <ItemDescription>
                              {photoShooting != null ? (
                                <Link href={`/admin/photo-shootings/${id}`}>
                                  {photoShooting.client.owner.name}
                                </Link>
                              ) : (
                                'nincs még foglalva'
                              )}
                            </ItemDescription>
                          </ItemContent>
                          <ItemActions>
                            <RevealedSwitch
                              disabled={photoShooting != null}
                              timeSlotId={id}
                              revealed={revealed}
                            />
                          </ItemActions>
                        </Item>
                      </li>
                    );
                  })}
                </ul>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
