import Link from 'next/link';

import { CalendarOffIcon, CalendarPlusIcon, CameraIcon } from 'lucide-react';

import { DeleteTimeSlotButton } from '@/components/DeleteTimeSlotButton';
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
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { monthDayFormatter, timeFormatter } from '@/lib/formatters';
import { cn, groupByDay } from '@/lib/utils';
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
              <AccordionTrigger className="text-lg text-primary">
                {monthDayFormatter.format(slots[0].startTime)}
              </AccordionTrigger>
              <AccordionContent>
                <ul className="flex flex-col gap-3">
                  {slots.map(({ id, revealed, startTime, photoShooting }) => {
                    return (
                      <li key={id} className="flex items-center gap-2">
                        <Item variant="outline">
                          <ItemMedia>
                            {photoShooting != null ? (
                              <div className="rounded-full bg-primary p-1">
                                <CameraIcon className="text-primary-foreground" />
                              </div>
                            ) : revealed ? (
                              <div className="rounded-full bg-muted p-1">
                                <CalendarPlusIcon className="text-accent-foreground" />
                              </div>
                            ) : (
                              <div className="rounded-full bg-muted p-1">
                                <CalendarOffIcon className="text-muted-foreground/50" />
                              </div>
                            )}
                          </ItemMedia>
                          <ItemContent>
                            <ItemTitle
                              className={cn(
                                !revealed && 'text-muted-foreground',
                              )}
                            >
                              {timeFormatter.format(startTime)}
                            </ItemTitle>
                            <ItemDescription>
                              {photoShooting != null ? (
                                <Link
                                  href={`/admin/photo-shootings/${photoShooting.id}`}
                                >
                                  {photoShooting.client.owner.name}
                                </Link>
                              ) : (
                                'szabad'
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
                        <DeleteTimeSlotButton
                          timeSlotId={id}
                          disabled={photoShooting != null}
                        />
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
