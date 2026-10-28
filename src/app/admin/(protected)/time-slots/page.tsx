import Link from 'next/link';

import {
  CalendarOffIcon,
  CalendarPlusIcon,
  CameraIcon,
  DownloadIcon,
} from 'lucide-react';

import { CreateTimeSlotDialog } from '@/components/CreateTimeSlotDialog';
import { DeleteTimeSlotButton } from '@/components/DeleteTimeSlotButton';
import { RevealedSwitch } from '@/components/RevealedSwitch';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { buttonVariants } from '@/components/ui/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { APP_URLS, PACKAGE_LABEL } from '@/lib/constants';
import { requireNavAccess } from '@/lib/dal';
import { dateFormatter, timeFormatter } from '@/lib/formatters';
import { fetchTimeSlotsAdmin } from '@/lib/queries';
import { cn, groupByDay } from '@/lib/utils';

export default async function AdminTimeSlotsPage() {
  await requireNavAccess('/admin/time-slots');

  const timeSlots = await fetchTimeSlotsAdmin();
  const groupedDays = groupByDay(timeSlots, (slot) => slot.startTime);
  const days = Array.from(groupedDays.entries());

  return (
    <div className="mx-auto flex w-full flex-col gap-6 lg:w-3xl">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <h1 className="text-lg font-semibold text-muted-foreground lg:text-2xl">
          Idősávok
        </h1>
        <div className="flex flex-col justify-between gap-2 lg:flex-row lg:items-center">
          <CreateTimeSlotDialog />
          <a
            href={APP_URLS.exportBookings}
            download
            className={buttonVariants({ variant: 'secondary' })}
          >
            <DownloadIcon />
            Foglalások exportálása .csv
          </a>
        </div>
      </div>
      {days.length === 0 ? (
        <p>Nincsenek timeslot-ok.</p>
      ) : (
        <Accordion
          multiple={false}
          // defaultValue={[days[0][0]]}
        >
          {days.map(([dayKey, slots]) => {
            const numberOfBookedSlots = slots.filter(
              (slot) => slot.photoShooting != null,
            ).length;

            // Eg. 9:00-20:00, the last starting at 19:00, there is 11 slots.
            const estimatedMaxPhotoShootingADay = 11;
            const percentage =
              (Math.max(numberOfBookedSlots, 0.2) /
                estimatedMaxPhotoShootingADay) *
              100;

            const fillClass =
              percentage < 40
                ? 'bg-[linear-gradient(var(--color-red-100),var(--color-red-100))] dark:bg-[linear-gradient(var(--color-red-800),var(--color-red-800))]'
                : percentage < 70
                  ? 'bg-[linear-gradient(var(--color-amber-100),var(--color-amber-100))] dark:bg-[linear-gradient(var(--color-amber-800),var(--color-amber-800))]'
                  : 'bg-[linear-gradient(var(--color-green-100),var(--color-green-100))] dark:bg-[linear-gradient(var(--color-green-800),var(--color-green-800))]';

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
                  {numberOfBookedSlots > 0 &&
                    `(${numberOfBookedSlots} fotózás)`}
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="flex flex-col gap-3">
                    {slots.map(
                      ({
                        id,
                        revealed,
                        startTime,
                        photoShooting,
                        allowedPackages,
                      }) => {
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
                                      {photoShooting.package} •{' '}
                                      {photoShooting.client.owner.name}
                                    </Link>
                                  ) : (
                                    <>
                                      {allowedPackages.length > 0 ? (
                                        <span className="font-bold text-destructive">
                                          Csak{' '}
                                          {allowedPackages
                                            .map((pkg) => PACKAGE_LABEL[pkg])
                                            .join(', ')}
                                          !
                                        </span>
                                      ) : (
                                        'Bármilyen csomag'
                                      )}
                                    </>
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
                      },
                    )}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
