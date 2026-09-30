'use client';

import {
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
import { Button } from '@/components/ui/button';
import { PhotoShootingStatus } from '@/generated/prisma/enums';
import { formatMoney } from '@/lib/utils';

import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

export function BalancePayment({
  remainingAmount,
  currentShootingStatus,
}: {
  remainingAmount: number;
  currentShootingStatus: PhotoShootingStatus;
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
      </Alert>
    );
  }

  return (
    <div className="flex flex-col-reverse items-center gap-6 rounded-lg py-6 lg:flex-row lg:justify-between">
      <div className="flex flex-col items-center gap-3 lg:flex-row">
        {shouldCollectBalancePayment && (
          <>
            <Button size="lg" variant="default">
              <WalletIcon />
              Készpénz
            </Button>
            <Button size="lg" variant="outline">
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
