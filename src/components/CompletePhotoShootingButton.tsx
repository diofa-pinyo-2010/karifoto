'use client';

import { useState, useTransition } from 'react';

import { CheckIcon, ImagesIcon } from 'lucide-react';

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
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { completePhotoShooting } from '@/server/photo-shootings';

export function CompletePhotoShootingButton({
  shootingId,
}: {
  shootingId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCompleting, startCompleting] = useTransition();

  function handleConfirm() {
    startCompleting(async () => {
      try {
        const res = await completePhotoShooting({ shootingId });

        setIsOpen(false);

        if ('error' in res) {
          toast.add({
            description: res.error,
            title: 'Nem sikerült a lezárás',
            type: 'error',
          });
          return;
        }

        toast.add({
          description: 'Az ügyfélnek elküldtük a végleges képekről az emailt.',
          title: 'Projekt lezárva',
          type: 'success',
        });
      } catch (err) {
        console.error(err);
        setIsOpen(false);
        toast.add({
          description: 'Nem sikerült a lezárás. Próbáld újra.',
          title: 'Nem sikerült a lezárás',
          type: 'error',
        });
      }
    });
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger
        render={
          <Button size="lg" variant="outline">
            <CheckIcon />
            Lezárás
          </Button>
        }
      />
      <AlertDialogContent size="sm" overlayClassName="bg-black/40">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <ImagesIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>Projekt lezárása</AlertDialogTitle>
          <AlertDialogDescription>
            Emailt küldünk az ügyfélnek, hogy elkészültek a végleges képek, és a
            projektet "Teljesítettre" állítjuk. Ez nem visszavonható!
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Mégse</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isCompleting}>
            {isCompleting ? <Spinner /> : <CheckIcon />}
            Lezárás
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
