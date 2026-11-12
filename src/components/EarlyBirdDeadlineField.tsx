'use client';

import { useState, useTransition } from 'react';

import { format } from 'date-fns';
import { Edit2Icon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Spinner } from '@/components/ui/spinner';
import { useIsMobile } from '@/hooks/use-mobile';
import { earlyBirdDeadlineFromDayKey } from '@/lib/early-bird';
import { longDateWithYearFormatter } from '@/lib/formatters';
import { getBudapestDayKey } from '@/lib/utils';
import { setEarlyBirdDeadline } from '@/server/site-settings';

// A Calendar böngésző-lokális dátumokkal dolgozik: a napkulcs y/m/d-jét
// lokális éjfélként adjuk át, és a kattintott nap lokális y/m/d-jét olvassuk
// vissza — így a böngésző időzónája nem tolja el a napot.
function dayKeyToLocalDate(dayKey: string) {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function EarlyBirdDeadlineField({
  earlyBirdDeadline,
}: {
  // yyyy-MM-dd, vagy null, ha még nincs beállítva.
  earlyBirdDeadline: string | null;
}) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const initialDayKey = earlyBirdDeadline ?? getBudapestDayKey(new Date());
  const [dayKey, setDayKey] = useState(initialDayKey);
  // Vezérelt hónap, különben a Calendar mindig a mai hónapon nyílna.
  const [month, setMonth] = useState(() => dayKeyToLocalDate(initialDayKey));
  const [isSaving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  const picked = earlyBirdDeadlineFromDayKey(dayKey);
  const isUnchanged = dayKey === earlyBirdDeadline;

  function handleOpenChange(opened: boolean) {
    setIsOpen(opened);
    if (opened) {
      // Mindig a mentett értéken nyílik, egy korábbi, elvetett választás nélkül.
      setSaveError(null);
      setDayKey(initialDayKey);
      setMonth(dayKeyToLocalDate(initialDayKey));
    }
  }

  function handleSave() {
    setSaveError(null);
    startSaving(async () => {
      try {
        const res = await setEarlyBirdDeadline(dayKey);
        if ('error' in res) {
          setSaveError(res.error);
          return;
        }
        setIsOpen(false);
      } catch (e) {
        console.error(e);
        setSaveError('Nem sikerült menteni a határidőt. Próbáld újra.');
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <span className="min-w-0">
        {earlyBirdDeadline ?? (
          <span className="text-muted-foreground">Nincs beállítva.</span>
        )}
      </span>
      <Drawer
        open={isOpen}
        onOpenChange={handleOpenChange}
        showSwipeHandle={isMobile}
        swipeDirection={isMobile ? 'down' : 'right'}
      >
        <DrawerTrigger
          render={
            <Button size="icon-sm" variant="outline" aria-label="Szerkesztés">
              <Edit2Icon />
            </Button>
          }
        />
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Early Bird határidő</DrawerTitle>
            <DrawerDescription>
              A kiválasztott nap előtt (budapesti idő szerint éjfélig) kezdődő
              időpontok számítanak early bird / last minute időpontnak.
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <Calendar
              mode="single"
              selected={dayKeyToLocalDate(dayKey)}
              onSelect={(date) => setDayKey(format(date, 'yyyy-MM-dd'))}
              month={month}
              onMonthChange={setMonth}
              required
              className="w-full rounded-lg border"
            />
            {picked && (
              <p className="mt-3 text-sm">
                Early bird/Last minute: Minden{' '}
                <span className="font-bold">
                  {longDateWithYearFormatter.format(picked)}
                </span>{' '}
                előtti időpont.
              </p>
            )}
          </div>
          <DrawerFooter className="border-t bg-accent pt-6">
            {saveError && (
              <p role="alert" className="text-red-700 dark:text-red-400">
                {saveError}
              </p>
            )}
            <Button
              type="button"
              size="lg"
              disabled={isSaving || isUnchanged}
              onClick={handleSave}
            >
              {isSaving ? <Spinner /> : 'Mentés'}
            </Button>
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
    </div>
  );
}
