'use client';

import { useRef, useState, useTransition } from 'react';

import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Clock2Icon, RefreshCcwIcon, RotateCcwIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerTrigger,
  DrawerClose,
} from '@/components/ui/drawer';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Item } from '@/components/ui/item';
import { Spinner } from '@/components/ui/spinner';
import { useIsMobile } from '@/hooks/use-mobile';
import { PACKAGE_LABEL, STUDIO_TZ } from '@/lib/constants';
import { shortFullDateFormatter, timeInputFormatter } from '@/lib/formatters';
import { cn, fromBudapestDayAndTime, getBudapestDayKey } from '@/lib/utils';
import {
  changeTimeOfPhotoShooting,
  getPhotoShootingsForDay,
  PhotoShootingsForDay,
} from '@/server/photo-shootings';

interface ChangeStartTimeButtonProps {
  currentStartTime: Date;
  shootingId: string;
}

export function ChangeStartTimeButton({
  currentStartTime,
  shootingId,
}: ChangeStartTimeButtonProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [startTime, setStartTime] = useState<Date>(currentStartTime);
  const [shootings, setShootings] = useState<PhotoShootingsForDay[]>();
  const [isLoading, startLoading] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const latestRequest = useRef(0);

  // `date` must already be a Budapest-anchored instant, so `dayBounds` on the
  // server picks the studio's calendar day.
  function loadDay(date: Date) {
    setError(null);
    const requestId = ++latestRequest.current;
    startLoading(async () => {
      try {
        const data = await getPhotoShootingsForDay(date, shootingId);
        if (requestId === latestRequest.current) {
          setShootings(data);
        }
      } catch (e) {
        console.error(e);
        if (requestId === latestRequest.current)
          setError('Could not load bookings');
      }
    });
  }

  function handleOpenChange(opened: boolean) {
    setIsOpen(opened);
    if (opened) {
      // Drop any unsaved pick from a previous (cancelled) open.
      setStartTime(currentStartTime);
      setSaveError(null);
      loadDay(currentStartTime);
    }
  }

  // The Calendar works in browser-local dates: the picked date's local
  // y/m/d is the day the admin clicked. Combine it with the Budapest time.
  function handleCalendarSelect(date: Date) {
    const next = fromBudapestDayAndTime(
      format(date, 'yyyy-MM-dd'),
      timeInputFormatter.format(startTime),
    );
    setStartTime(next);
    loadDay(next);
  }

  function handleTimeChange(time: string) {
    if (!time) return;
    setStartTime(fromBudapestDayAndTime(getBudapestDayKey(startTime), time));
  }

  function handleConfirm() {
    setSaveError(null);
    startSaving(async () => {
      try {
        const res = await changeTimeOfPhotoShooting({
          shootingId,
          newStartTime: startTime,
        });
        if (res && 'error' in res) {
          setSaveError(res.error);
          return;
        }
        setIsOpen(false);
      } catch (e) {
        console.error(e);
        setSaveError('Nem sikerült módosítani az időpontot. Próbáld újra.');
      }
    });
  }

  return (
    <Drawer
      open={isOpen}
      onOpenChange={handleOpenChange}
      showSwipeHandle={isMobile}
      swipeDirection={isMobile ? 'down' : 'right'}
    >
      <DrawerTrigger
        render={
          <Button variant="destructive" className="uppercase" size="lg">
            <RefreshCcwIcon />
            Új időpont
          </Button>
        }
      />
      <DrawerContent>
        <div className="flex-1 scroll-fade overflow-y-auto p-4">
          <Card>
            <CardContent>
              <Calendar
                mode="single"
                selected={toZonedTime(startTime, STUDIO_TZ)}
                onSelect={handleCalendarSelect}
                required
                className="w-full"
              />
            </CardContent>
            <CardFooter className="flex flex-col items-start">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="startTime">Kezdés</FieldLabel>
                  <InputGroup className="bg-background">
                    <InputGroupInput
                      id="startTime"
                      type="time"
                      value={timeInputFormatter.format(startTime)}
                      onChange={(e) => handleTimeChange(e.target.value)}
                    />
                    <InputGroupAddon>
                      <Clock2Icon className="text-muted-foreground" />
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
              </FieldGroup>

              <div className="mt-3 flex w-full items-center justify-between gap-2">
                <p className="font-bold">
                  {shortFullDateFormatter.format(startTime)}
                </p>
                <Button
                  variant="outline"
                  onClick={() => setStartTime(currentStartTime)}
                >
                  <RotateCcwIcon />
                  Reset
                </Button>
              </div>
            </CardFooter>
          </Card>

          {shootings && (
            <Card className="mt-3 bg-accent/50">
              <CardHeader>
                <CardTitle>Többi fotózás aznap</CardTitle>
              </CardHeader>
              <CardContent>
                {error && (
                  <p className="mb-2 text-red-700 dark:text-red-400">{error}</p>
                )}
                {isLoading && <Spinner />}
                {!isLoading && shootings.length === 0 && (
                  <p className="text-muted-foreground">
                    Nincs még foglalás erre a napra.
                  </p>
                )}
                {!isLoading && shootings.length > 0 && (
                  <div className="flex flex-col gap-1">
                    {shootings.map((shooting) => (
                      <Item
                        key={shooting.id}
                        variant="outline"
                        size="xs"
                        className={cn(
                          'bg-background/50',
                          shooting.id === shootingId &&
                            'border-dashed border-green-400',
                        )}
                      >
                        {timeInputFormatter.format(shooting.timeSlot.startTime)}{' '}
                        • {PACKAGE_LABEL[shooting.package]}{' '}
                        {shooting.isLightPlaySelected && '(+ Fényjáték)'}
                      </Item>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        <DrawerFooter className="border-t bg-accent pt-6">
          {saveError && (
            <p role="alert" className="text-red-700 dark:text-red-400">
              {saveError}
            </p>
          )}
          <Button
            variant="default"
            size="lg"
            onClick={handleConfirm}
            disabled={
              isSaving || startTime.getTime() === currentStartTime.getTime()
            }
          >
            {isSaving ? (
              <>
                {' '}
                <Spinner /> Várj...{' '}
              </>
            ) : startTime.getTime() === currentStartTime.getTime() ? (
              'Válassz új időpontot'
            ) : (
              'Mentés'
            )}
          </Button>
          <DrawerClose
            render={
              <Button variant="ghost" size="lg" disabled={isSaving}>
                Mégse
              </Button>
            }
          />
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
