'use client';

import { useState, useTransition } from 'react';

import { FlagIcon, HeartIcon, RotateCwIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { formatMoney } from '@/lib/utils';
import {
  confirmImageSelection,
  previewImageSelection,
} from '@/server/image-selection';

import type { ImageSelectionPreview } from '@/server/image-selection';

/**
 * "Kész vagyok": a szerver megszámolja a galériában megjelölt képeket, a
 * dialógus megmutatja a számokat és az extra díjat, az ügyfél pedig vagy
 * beküldi (ha nincs extra), vagy fizet. A számok itt csak tájékoztatnak: a
 * beküldéskor a szerver újra megszámol.
 */
export function ImageSelectionDialog({
  clientProfileId,
  shootingId,
  disabled = false,
}: {
  clientProfileId: string;
  shootingId: string;
  /** Staff may view the portal but cannot submit on the client's behalf. */
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<ImageSelectionPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCounting, startCounting] = useTransition();
  const [isConfirming, startConfirming] = useTransition();

  function count() {
    setError(null);
    setPreview(null);
    startCounting(async () => {
      try {
        const result = await previewImageSelection(clientProfileId, shootingId);
        if ('error' in result) {
          setError(result.error);
          return;
        }
        setPreview(result);
      } catch (caught) {
        console.error(caught);
        setError('Nem sikerült megszámolni a képeket. Próbáld újra.');
      }
    });
  }

  function confirm() {
    if (preview == null) return;
    setError(null);
    startConfirming(async () => {
      try {
        const result = await confirmImageSelection(
          clientProfileId,
          shootingId,
          {
            editedImages: preview.editedImages,
            retouchedImages: preview.retouchedImages,
          },
        );
        if ('error' in result) {
          setError(result.error);
          return;
        }
        // A szerver újravalidálta az oldalt, a szekció átvált a köszönőre.
        setOpen(false);
      } catch (caught) {
        console.error(caught);
        setError('Nem sikerült beküldeni a válogatást. Próbáld újra.');
      }
    });
  }

  const needsPayment = preview != null && preview.extraInCents > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) count();
      }}
    >
      <DialogTrigger
        render={
          <Button size="lg" disabled={disabled} className="w-full sm:w-fit" />
        }
      >
        Kész vagyok
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>A válogatásod</DialogTitle>
          <DialogDescription>
            Ezt látjuk most a galériában. Ha valami nem stimmel, zárd be,
            javítsd a jelöléseket, és kattints újra.
          </DialogDescription>
        </DialogHeader>

        {isCounting && (
          <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Spinner />
            Számoljuk a megjelölt képeket… Ez eltarthat néhány másodpercig.
          </p>
        )}

        {preview != null && (
          <div className="flex flex-col gap-4 text-sm">
            <ul className="flex flex-col gap-2">
              <li className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2">
                  <FlagIcon className="size-4 fill-black" />
                  Szerkesztésre
                </span>
                <span className="font-medium">
                  {preview.editedImages} db{' '}
                  <span className="text-muted-foreground">
                    (csomagban: {preview.allowance} db)
                  </span>
                </span>
              </li>
              <li className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2">
                  <HeartIcon className="size-4 fill-red-500 text-red-500" />
                  Extra retusra
                </span>
                <span className="font-medium">
                  {preview.retouchedImages} db
                </span>
              </li>
            </ul>

            <ul className="flex flex-col gap-2 border-t pt-3">
              {preview.lines.map((line) => (
                <li key={line.label} className="flex justify-between gap-4">
                  <span>{line.label}</span>
                  <span className="font-medium whitespace-nowrap">
                    {formatMoney(line.amountInCents)}
                  </span>
                </li>
              ))}
              <li className="flex justify-between gap-4 text-base font-bold">
                <span>Fizetendő</span>
                <span className="whitespace-nowrap">
                  {formatMoney(preview.extraInCents)}
                </span>
              </li>
            </ul>

            {preview.editedImages === 0 && (
              <p className="text-amber-700">
                Nem találtunk fekete zászlós képet. Biztosan megjelölted őket?
              </p>
            )}
          </div>
        )}

        {error != null && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
            {preview == null && !isCounting && (
              <Button variant="outline" size="sm" onClick={count}>
                <RotateCwIcon />
                Újra
              </Button>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => setOpen(false)}
          >
            Mégse
          </Button>
          {needsPayment ? (
            // TODO: Stripe Checkout session indítása (lásd "The payment step"
            // az image-selection.md-ben). Addig nincs bekötve.
            <Button size="lg" className="w-full sm:w-auto" disabled>
              Fizetés
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-full sm:w-auto"
              disabled={
                preview == null || preview.editedImages === 0 || isConfirming
              }
              onClick={confirm}
            >
              {isConfirming && <Spinner />}
              Beküldés
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
