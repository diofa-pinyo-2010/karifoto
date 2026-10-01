'use client';

import { useState, useTransition } from 'react';

import {
  BadgeAlertIcon,
  CheckCircle2Icon,
  CheckIcon,
  CreditCardIcon,
  TriangleAlertIcon,
  WalletIcon,
} from 'lucide-react';

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
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
import { PhotoShootingStatus } from '@/generated/prisma/enums';
import { formatMoney } from '@/lib/utils';
import { recordCashBalancePayment } from '@/server/balance-payment';

import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

export function BalancePayment({
  remainingAmount,
  currentShootingStatus,
  shootingId,
}: {
  remainingAmount: number;
  currentShootingStatus: PhotoShootingStatus;
  shootingId: string;
}) {
  const shouldCollectBalancePayment =
    currentShootingStatus === 'WAITING_FOR_BALANCE_PAYMENT';

  if (remainingAmount === 0) {
    return (
      <Alert className="bg-lime-50 text-lime-900 dark:bg-lime-950 dark:text-lime-50">
        <CheckCircle2Icon />
        <AlertTitle>Minden fizetve!</AlertTitle>
        <AlertDescription className="text-lime-900/70 dark:text-lime-50/70">
          Jelenleg nincs több fizetnivaló. A képek feldolgozásakor még
          merülhetnek fel követelések.
        </AlertDescription>
        {currentShootingStatus === 'READY_TO_COMPLETE' && (
          <AlertAction>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button size="lg" variant="outline">
                    <CheckIcon />
                    Lezárás
                  </Button>
                }
              />
              <TooltipContent>
                <p>
                  Ha ezt a gombot látod, akkor nincs több fizetnivaló, és a
                  végleges képek URL-je is fel van töltve: a projekt zárható.
                  Email-t küldünk az ügyfélnek a végleges képek linkjével.
                </p>
              </TooltipContent>
            </Tooltip>
          </AlertAction>
        )}
      </Alert>
    );
  }

  return (
    <div className="flex flex-col-reverse items-center gap-6 rounded-lg py-6 lg:flex-row lg:justify-between">
      <div className="flex w-full flex-col items-stretch gap-3 lg:w-auto lg:flex-row lg:items-center">
        {shouldCollectBalancePayment && (
          <>
            <CashPaymentButton
              remainingAmount={remainingAmount}
              shootingId={shootingId}
            />
            {/* SumUp terminál: még nincs bekötve, lásd src/docs/upcoming-work.md 3. */}
            <Button className="w-full lg:w-auto" size="lg" variant="outline">
              <CreditCardIcon />
              Bankkártya
            </Button>
          </>
        )}
      </div>
      <p className="flex items-center gap-2 text-xl font-bold">
        {shouldCollectBalancePayment && (
          <TriangleAlertIcon className="text-amber-500" />
        )}
        Még fizetendő: {formatMoney(remainingAmount)}
      </p>
    </div>
  );
}

/**
 * A készpénz átvétele nem vonható vissza (valódi végszámla készül róla a
 * szamlazz.hu-n), ezért megerősítést kér, és a dialógus az összeget mondja ki,
 * nem csak a műveletet.
 *
 * Az összeget a szerver újraszámolja: ez a szám itt csak tájékoztat.
 */
function CashPaymentButton({
  remainingAmount,
  shootingId,
}: {
  remainingAmount: number;
  shootingId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  function handleConfirm() {
    setSaveError(null);
    startSaving(async () => {
      try {
        const result = await recordCashBalancePayment(shootingId);
        if ('error' in result) {
          setSaveError(result.error);
          return;
        }
        setIsOpen(false);
        toast.add({
          description: 'A végszámla hamarosan megérkezik az ügyfélhez.',
          title: 'Készpénzes fizetés rögzítve',
          type: 'success',
        });
      } catch (error) {
        console.error(error);
        setSaveError('Nem sikerült rögzíteni a fizetést. Próbáld újra.');
      }
    });
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-2 lg:w-auto lg:items-center">
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogTrigger
          render={
            <Button
              className="w-full lg:w-auto"
              disabled={isSaving}
              size="lg"
              variant="default"
            >
              {isSaving ? <Spinner /> : <WalletIcon />}
              Készpénz
            </Button>
          }
        />
        <AlertDialogContent size="sm" overlayClassName="bg-black/40">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <BadgeAlertIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Készpénzes fizetés rögzítése</AlertDialogTitle>
            <AlertDialogDescription>
              Vegyél át pontosan <strong>{formatMoney(remainingAmount)}</strong>
              -ot készpénzben. Rögzítjük a fizetést, és kiállítjuk a végszámlát
              az ügyfélnek. Ez nem vonható vissza.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégse</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isSaving}>
              {isSaving ? <Spinner /> : null}
              Átvettem
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {saveError && (
        <p className="text-sm text-destructive" role="alert">
          {saveError}
        </p>
      )}
    </div>
  );
}
