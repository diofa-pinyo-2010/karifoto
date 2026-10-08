'use client';

import { useState, useTransition } from 'react';

import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { BadgeQuestionMarkIcon, Clock2Icon, RotateCcwIcon } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerTrigger,
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
import { useShootingsForDay } from '@/hooks/use-shootings-for-day';
import { PACKAGE_LABEL, STUDIO_TZ } from '@/lib/constants';
import { shortFullDateFormatter, timeInputFormatter } from '@/lib/formatters';
import { fromBudapestDayAndTime, getBudapestDayKey } from '@/lib/utils';

interface StartTimeDrawerProps {
  // Not given → the drawer opens on the current Budapest time.
  value?: Date;
  onConfirm: (next: Date) => Promise<{ error: string } | void> | void;
  trigger: React.ReactElement;
  // Left out of the day's list — the shooting being moved.
  excludeShootingId?: string;
  confirmLabel: string;
  // When set, confirming goes through an "are you sure" dialog first.
  confirmation?: { description: string };
  // Confirm stays disabled until the picked time differs from `value`.
  requireChange?: boolean;
}

// The current Budapest time, truncated to the minute the time input can show.
function nowInBudapest() {
  const now = new Date();
  return fromBudapestDayAndTime(
    getBudapestDayKey(now),
    timeInputFormatter.format(now),
  );
}

export function StartTimeDrawer({
  value,
  onConfirm,
  trigger,
  excludeShootingId,
  confirmLabel,
  confirmation,
  requireChange = false,
}: StartTimeDrawerProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [startTime, setStartTime] = useState<Date>(
    () => value ?? nowInBudapest(),
  );
  // Month shown by the Calendar — controlled, otherwise it opens on today.
  const [month, setMonth] = useState(() => toZonedTime(startTime, STUDIO_TZ));
  const [isSaving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const { shootings, isLoading, error } = useShootingsForDay(
    isOpen ? startTime : undefined,
    excludeShootingId,
  );

  const isDirty = value == null || startTime.getTime() !== value.getTime();
  const isUnchanged = requireChange && !isDirty;

  // Back to the initial time: selection and shown month.
  function reset() {
    const initial = value ?? nowInBudapest();
    setStartTime(initial);
    setMonth(toZonedTime(initial, STUDIO_TZ));
  }

  function handleOpenChange(opened: boolean) {
    setIsOpen(opened);
    if (opened) {
      // Drop any unconfirmed pick from a previous (cancelled) open.
      setSaveError(null);
      reset();
    }
  }

  // The Calendar works in browser-local dates: the picked date's local
  // y/m/d is the day the admin clicked. Combine it with the Budapest time.
  function handleCalendarSelect(date: Date) {
    setStartTime(
      fromBudapestDayAndTime(
        format(date, 'yyyy-MM-dd'),
        timeInputFormatter.format(startTime),
      ),
    );
  }

  function handleTimeChange(time: string) {
    if (!time) return;
    setStartTime(fromBudapestDayAndTime(getBudapestDayKey(startTime), time));
  }

  function handleConfirm() {
    setSaveError(null);
    startSaving(async () => {
      try {
        const res = await onConfirm(startTime);
        if (res && 'error' in res) {
          setSaveError(res.error);
          return;
        }
        setIsOpen(false);
      } catch (e) {
        console.error(e);
        setSaveError('Nem sikerült menteni az időpontot. Próbáld újra.');
      }
    });
  }

  const buttonLabel = isUnchanged ? 'Válassz új időpontot' : confirmLabel;
  const isConfirmDisabled = isSaving || isUnchanged;

  return (
    <Drawer
      open={isOpen}
      onOpenChange={handleOpenChange}
      showSwipeHandle={isMobile}
      swipeDirection={isMobile ? 'down' : 'right'}
    >
      <DrawerTrigger render={trigger} />
      <DrawerContent>
        <div className="flex-1 scroll-fade overflow-y-auto p-4">
          <Card>
            <CardContent>
              <Calendar
                mode="single"
                selected={toZonedTime(startTime, STUDIO_TZ)}
                onSelect={handleCalendarSelect}
                month={month}
                onMonthChange={setMonth}
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
                <Button type="button" variant="outline" onClick={reset}>
                  <RotateCcwIcon />
                  Reset
                </Button>
              </div>
            </CardFooter>
          </Card>

          {(shootings || error) && (
            <Card className="mt-3 bg-accent/50">
              <CardHeader>
                <CardTitle>Fotózások aznap</CardTitle>
              </CardHeader>
              <CardContent>
                {error && (
                  <p className="mb-2 text-red-700 dark:text-red-400">{error}</p>
                )}
                {isLoading && <Spinner />}
                {!isLoading && !error && shootings?.length === 0 && (
                  <p className="text-muted-foreground">
                    Nincs még foglalás erre a napra.
                  </p>
                )}
                {!isLoading && shootings && shootings.length > 0 && (
                  <div className="flex flex-col gap-1">
                    {shootings.map((shooting) => (
                      <Item
                        key={shooting.id}
                        variant="outline"
                        size="xs"
                        className="bg-background/50 text-xs"
                      >
                        {timeInputFormatter.format(shooting.timeSlot.startTime)}{' '}
                        • {PACKAGE_LABEL[shooting.package]}{' '}
                        {shooting.isLightPlaySelected && '+ Fényjáték'} (
                        {shooting.client.owner.name})
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
          {confirmation ? (
            <SubmitButtonWithAlertDialog
              onConfirm={handleConfirm}
              disabled={isConfirmDisabled}
              buttonLabel={buttonLabel}
              isLoading={isSaving}
              description={confirmation.description}
            />
          ) : (
            <Button
              type="button"
              size="lg"
              disabled={isConfirmDisabled}
              onClick={handleConfirm}
            >
              {isSaving ? <Spinner /> : buttonLabel}
            </Button>
          )}
          <DrawerClose
            render={
              <Button
                type="button"
                variant="ghost"
                size="lg"
                disabled={isSaving}
              >
                Mégse
              </Button>
            }
          />
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

interface SubmitButtonWithAlertDialogProps {
  onConfirm: () => void;
  disabled: boolean;
  isLoading: boolean;
  buttonLabel: string;
  description: string;
}

function SubmitButtonWithAlertDialog({
  onConfirm,
  disabled,
  isLoading,
  buttonLabel,
  description,
}: SubmitButtonWithAlertDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button type="button" variant="default" size="lg" disabled={disabled}>
            {isLoading ? <Spinner /> : buttonLabel}
          </Button>
        }
      />
      <AlertDialogContent size="sm" overlayClassName="bg-black/40">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <BadgeQuestionMarkIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>Biztos vagy benne?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Mégse</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            Mentés & Küldés
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
