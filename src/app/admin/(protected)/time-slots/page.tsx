import Link from 'next/link';

import { CalendarOffIcon, CalendarPlusIcon, CameraIcon } from 'lucide-react';

import { CreateTimeSlotDialog } from '@/components/CreateTimeSlotDialog';
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
import { APP_URLS } from '@/lib/constants';
import { dateFormatter, timeFormatter } from '@/lib/formatters';
import { fetchTimeSlotsAdmin } from '@/lib/queries';
import { cn, groupByDay } from '@/lib/utils';

export default async function AdminTimeSlotsPage() {
  const timeSlots = await fetchTimeSlotsAdmin();
  const groupedDays = groupByDay(timeSlots, (slot) => slot.startTime);
  const days = Array.from(groupedDays.entries());

  if (days.length === 0) {
    return <p>Nincsenek timeslot-ok.</p>;
  }

  return (
    <div className="mx-auto flex w-full flex-col gap-6 lg:w-3xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold text-muted-foreground lg:text-2xl">
          Idősávok
        </h1>
        <CreateTimeSlotDialog />
      </div>
      <Accordion multiple={false} defaultValue={[days[0][0]]}>
        {days.map(([dayKey, slots]) => {
          const numberOfBookedSlots = slots.filter(
            (slot) => slot.photoShooting != null,
          ).length;

          // Eg. 9:00-20:00, the last starting at 19:00, there is 11 slots.
          const estimatedMaxPhotoShootingADay = 8;
          const percentage =
            (Math.max(numberOfBookedSlots, 0.5) /
              estimatedMaxPhotoShootingADay) *
            100;

          const fillClass =
            percentage < 50
              ? 'bg-[linear-gradient(var(--color-red-100),var(--color-red-100))] dark:bg-[linear-gradient(var(--color-red-950),var(--color-red-950))]'
              : percentage < 80
                ? 'bg-[linear-gradient(var(--color-amber-100),var(--color-amber-100))] dark:bg-[linear-gradient(var(--color-amber-950),var(--color-amber-950))]'
                : 'bg-[linear-gradient(var(--color-green-100),var(--color-green-100))] dark:bg-[linear-gradient(var(--color-green-950),var(--color-green-950))]';

          return (
            <AccordionItem key={dayKey} value={dayKey}>
              <AccordionTrigger
                className={cn(
                  'bg-left bg-no-repeat px-3 text-lg transition-[background-size] duration-500',
                  fillClass,
                )}
                style={{ backgroundSize: `${percentage}% 100%` }}
              >
                {dateFormatter.format(slots[0].startTime)}{' '}
                {numberOfBookedSlots > 0 && `(${numberOfBookedSlots} fotózás)`}
              </AccordionTrigger>
              <AccordionContent>
                <ul className="flex flex-col gap-3">
                  {slots.map(({ id, revealed, startTime, photoShooting }) => {
                    return (
                      <li key={id} className="flex items-center gap-2">
                        <Item
                          variant="outline"
                          className={cn(
                            photoShooting != null && 'bg-primary/5',
                          )}
                        >
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
                                  href={APP_URLS.photoShootingAdminPage(
                                    photoShooting.id,
                                  )}
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
