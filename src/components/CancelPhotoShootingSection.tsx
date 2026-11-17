'use client';

import { useState, useTransition } from 'react';

import { BanIcon } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { shortFullDateFormatter } from '@/lib/formatters';
import { formatMoney } from '@/lib/utils';
import { cancelPhotoShooting } from '@/server/cancel-photo-shooting';

import type { CancellationEligibility } from '@/lib/cancellation';

interface CancelPhotoShootingSectionProps {
  shootingId: string;
  eligibility: CancellationEligibility;
  cancelled: {
    at: Date;
    reason: string | null;
    refund: { amountInCents: number; stornoUrl: string | null } | null;
  } | null;
}

export function CancelPhotoShootingSection({
  shootingId,
  eligibility,
  cancelled,
}: CancelPhotoShootingSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [refund, setRefund] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, startCancelling] = useTransition();

  if (cancelled) {
    return (
      <div className="flex flex-col gap-2 text-sm">
        <p className="font-medium">
          Lemondva: {shortFullDateFormatter.format(cancelled.at)}
        </p>
        <p className="text-muted-foreground">
          Indok: {cancelled.reason ?? '–'}
        </p>
        {cancelled.refund && (
          <p className="text-muted-foreground">
            Visszatérítve: {formatMoney(cancelled.refund.amountInCents)} ·{' '}
            {cancelled.refund.stornoUrl ? (
              <a
                href={cancelled.refund.stornoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline underline-offset-4 dark:text-blue-300"
              >
                Sztornó számla
              </a>
            ) : (
              'Sztornó számla készül…'
            )}
          </p>
        )}
      </div>
    );
  }

  if (!eligibility.canCancel) {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="destructive" className="self-start" disabled>
          <BanIcon />
          Lemondás
        </Button>
        <p className="text-sm text-muted-foreground">{eligibility.reason}</p>
      </div>
    );
  }

  const { payment, canRefund } = eligibility;

  function handleOpenChange(open: boolean) {
    // Mentés közben nem zárjuk be, hogy ne vesszen el a folyamat jelzése.
    if (isCancelling) return;
    setIsOpen(open);
    if (open) {
      setRefund(false);
      setReason('');
      setError(null);
    }
  }

  function handleConfirm() {
    setError(null);
    startCancelling(async () => {
      try {
        const res = await cancelPhotoShooting({
          shootingId,
          refund: canRefund && refund,
          reason,
        });

        if ('error' in res) {
          setError(res.error);
          return;
        }

        setIsOpen(false);
        toast.add({
          title: 'Fotózás lemondva',
          description: refund
            ? 'A visszatérítés elindult, a sztornó számla hamarosan elkészül.'
            : 'A fotózás le lett mondva.',
          type: 'success',
        });
      } catch (err) {
        console.error(err);
        setError('Nem sikerült a lemondás. Próbáld újra.');
      }
    });
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger
        render={
          <Button variant="destructive" className="self-start">
            <BanIcon />
            Lemondás
          </Button>
        }
      />
      <AlertDialogContent overlayClassName="bg-black/40">
        <AlertDialogHeader>
          <AlertDialogTitle>Fotózás lemondása</AlertDialogTitle>
          <AlertDialogDescription>
            A fotózás lemondva lesz, az időpont felszabadul, a naptári esemény
            törlődik. Ez nem visszavonható!
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label className="items-start gap-2">
              <Checkbox
                checked={refund}
                onCheckedChange={setRefund}
                disabled={!canRefund || isCancelling}
                className="mt-0.5"
              />
              <span>
                Visszatérítés: {formatMoney(payment.amountInCents)} visszamegy a
                kártyára (+ sztornó számla)
              </span>
            </Label>
            {!canRefund && (
              <p className="text-sm text-muted-foreground">
                Nem kártyás fizetés, ezért nem téríthető vissza automatikusan.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cancellation-reason">Lemondás indoka</Label>
            <Textarea
              id="cancellation-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={1000}
              disabled={isCancelling}
              placeholder="Opcionális"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isCancelling}>Mégse</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isCancelling}
          >
            {isCancelling ? <Spinner /> : <BanIcon />}
            Lemondás
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
