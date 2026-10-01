'use client';

import { useState, useTransition } from 'react';

import {
  AlertTriangleIcon,
  BadgeCheckIcon,
  ImagesIcon,
  InfoIcon,
  SendIcon,
} from 'lucide-react';

import { DetailRow } from '@/components/DetailRow';
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
import { FieldError } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { type PhotoShooting } from '@/generated/prisma/client';
import { PhotoShootingStatus } from '@/generated/prisma/enums';
import { shortFullDateFormatter } from '@/lib/formatters';
import { sendRawImagesForSelection } from '@/server/photo-shootings';

export function SendRawImages({
  selectionRequestedAt,
  rawImagesUrl,
  id,
  status,
}: Pick<
  PhotoShooting,
  'selectionRequestedAt' | 'rawImagesUrl' | 'id' | 'status'
>) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSending, startSaving] = useTransition();
  const isSendingBlocked =
    rawImagesUrl == null || status != PhotoShootingStatus.RAW_PHOTOS_UPLOAD;

  function handleConfirm() {
    setError(null);
    startSaving(async () => {
      try {
        const res = await sendRawImagesForSelection({ shootingId: id });

        if ('error' in res) {
          setError(res.error);
          setIsOpen(false);
          return;
        }
        toast.add({
          description: 'A végszámla hamarosan megérkezik az ügyfélhez.',
          title: 'Készpénzes fizetés rögzítve',
          type: 'success',
        });
      } catch (err) {
        console.error(err);
        setIsOpen(false);
        setError('Nem sikerlült a küldés. Próbáld újra.');
      }
    });
  }

  return (
    <DetailRow
      label={
        <div className="flex items-center gap-1">
          <p>Küldés</p>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button size="icon-sm" variant="ghost">
                  <InfoIcon />
                </Button>
              }
            />
            <TooltipContent>
              <p>A nyers képeket elküldjük az ügyfélnek.</p>
            </TooltipContent>
          </Tooltip>
        </div>
      }
      value={
        selectionRequestedAt != null ? (
          <p className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-muted-foreground">
              <BadgeCheckIcon className="size-5 text-lime-600 dark:text-lime-400" />{' '}
              Elküldve:
            </span>{' '}
            {shortFullDateFormatter.format(selectionRequestedAt)}
          </p>
        ) : (
          <div className="flex items-center gap-2">
            {error && <FieldError>{error}</FieldError>}
            <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
              <AlertDialogTrigger
                render={
                  <Button
                    disabled={isSendingBlocked}
                    variant={isSendingBlocked ? 'outline' : 'default'}
                    className="disabled:cursor-not-allowed"
                  >
                    <SendIcon />
                    Küldés
                  </Button>
                }
              />
              <AlertDialogContent size="sm" overlayClassName="bg-black/40">
                <AlertDialogHeader>
                  <AlertDialogMedia>
                    <ImagesIcon />
                  </AlertDialogMedia>
                  <AlertDialogTitle>Nyers képek elküldése</AlertDialogTitle>
                  <AlertDialogDescription>
                    Elküldjük a nyers képek linkjét az ügyfélnek válogatásra. Ez
                    nem visszavonható!
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Mégse</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleConfirm}
                    disabled={isSending}
                  >
                    {isSending ? <Spinner /> : <SendIcon />}
                    Küldés
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {isSendingBlocked && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button size="icon-sm" variant="ghost">
                      <AlertTriangleIcon />
                    </Button>
                  }
                />
                <TooltipContent>
                  <p>
                    Nem küldhető: Az egyenlegnek fizetve kell lennie + nyers
                    képeket fel kell tölteni.
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )
      }
    />
  );
}
