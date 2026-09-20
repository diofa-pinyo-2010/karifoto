'use client';

import { useState, useTransition } from 'react';

import { CalendarPlusIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Field,
  FieldError,
  FieldLabel,
  FieldContent,
  FieldDescription,
  FieldTitle,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { shortFullDateFormatter } from '@/lib/formatters';
import { createTimeSlot } from '@/server/time-slots';

const DEFAULT_TIME = '09:00';

export function CreateTimeSlotDialog() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState(DEFAULT_TIME);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setDate(undefined);
    setTime(DEFAULT_TIME);
    setRevealed(false);
    setError(null);
  }

  function handleSubmit() {
    if (date == null || !time) {
      setError('Add meg a dátumot és az időpontot.');
      return;
    }

    const [hours, minutes] = time.split(':').map(Number);
    const startTime = new Date(date);
    startTime.setHours(hours, minutes, 0, 0);

    startTransition(async () => {
      const result = await createTimeSlot(startTime, revealed);
      if ('error' in result) {
        setError(result.error);
        return;
      }

      setOpen(false);
      reset();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogTrigger render={<Button />}>
        <CalendarPlusIcon />
        Új idősáv
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Új idősáv</DialogTitle>
          <DialogDescription>
            A fotózás vége automatikusan a kezdés után 1 órával lesz.
          </DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel>Dátum</FieldLabel>
          <Popover>
            <PopoverTrigger render={<Button variant="outline" />}>
              {date ? shortFullDateFormatter.format(date) : 'Válassz dátumot'}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={date} onSelect={setDate} />
            </PopoverContent>
          </Popover>
        </Field>

        <Field>
          <FieldLabel htmlFor="time-slot-time">Időpont</FieldLabel>
          <Input
            id="time-slot-time"
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
          />
        </Field>
        <FieldLabel htmlFor="time-slot-revealed">
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>Legyen SZABAD?</FieldTitle>
              <FieldDescription>
                Itt megadhatod, hogy a főoldalon Szabadnak mutassuk az idősávot,
                vagy Foglaltnak.
              </FieldDescription>
            </FieldContent>
            <Switch
              id="time-slot-revealed"
              checked={revealed}
              onCheckedChange={(checked) => setRevealed(checked)}
            />
          </Field>
        </FieldLabel>

        {error != null && <FieldError>{error}</FieldError>}

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={pending}
            size="lg"
            className="w-full"
          >
            {pending ? <Spinner /> : 'Létrehozás'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
