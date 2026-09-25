'use client';

import { useState } from 'react';

import {
  CircleAlertIcon,
  Clock2Icon,
  RefreshCcwIcon,
  RotateCcwIcon,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from '@/components/ui/drawer';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { useIsMobile } from '@/hooks/use-mobile';
import { shortFullDateFormatter, timeInputFormatter } from '@/lib/formatters';

export function ChangeStartTimeButton({
  currentStartTime,
}: {
  currentStartTime: Date;
}) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [startTime, setStartTime] = useState<Date>(currentStartTime);

  function handleConfirm() {
    console.log(startTime);
  }

  return (
    <Drawer
      open={isOpen}
      onOpenChange={setIsOpen}
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
        <DrawerHeader className="border-b">
          <DrawerTitle>Időpont megváltoztatása</DrawerTitle>
          <DrawerDescription>
            Egy másik, szabad idősávhoz rendeljük ezt a fotózást, vagy egy újat
            hozunk létre.
          </DrawerDescription>
          <Alert className="my-3">
            <CircleAlertIcon />
            <AlertTitle>Fontos!</AlertTitle>
            <AlertDescription>
              Ellenőrizd a naptárban, hogy szabad-e az időpont!
            </AlertDescription>
          </Alert>
        </DrawerHeader>
        <div className="flex-1 scroll-fade overflow-y-auto p-4">
          <Card>
            <CardContent>
              <Calendar
                mode="single"
                selected={startTime}
                onSelect={(date) => {
                  const next = new Date(date);
                  next.setHours(
                    startTime.getHours(),
                    startTime.getMinutes(),
                    0,
                    0,
                  );
                  setStartTime(next);
                }}
                required
                className="w-full"
              />
            </CardContent>
            <CardFooter>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="startTime">Kezdés</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="startTime"
                      type="time"
                      value={timeInputFormatter.format(startTime)}
                      onChange={(e) => {
                        console.log(e.target.value);
                        const [hours, mins] = e.target.value
                          .split(':')
                          .map(Number);
                        const next = new Date(startTime);
                        next.setHours(hours, mins, 0, 0);
                        setStartTime(next);
                      }}
                    />
                    <InputGroupAddon>
                      <Clock2Icon className="text-muted-foreground" />
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
              </FieldGroup>
            </CardFooter>
          </Card>
          <Button
            className="mt-3"
            variant="outline"
            onClick={() => setStartTime(currentStartTime)}
          >
            <RotateCcwIcon />
            Reset
          </Button>
          <div className="my-10 rounded-md border bg-accent p-3 text-lg">
            <p>A kiválasztott időpont:</p>
            <p className="font-bold">
              {shortFullDateFormatter.format(startTime)}
            </p>
          </div>
        </div>
        <DrawerFooter className="border-t bg-accent pt-6">
          <Button variant="default" size="lg" onClick={handleConfirm}>
            Mentés
          </Button>
          <DrawerClose
            render={
              <Button variant="ghost" size="lg">
                Mégse
              </Button>
            }
          />
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
