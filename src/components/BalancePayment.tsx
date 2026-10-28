'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import {
  BadgeAlertIcon,
  BadgeInfoIcon,
  CheckCircle2Icon,
  CheckIcon,
  CoinsIcon,
  CreditCardIcon,
  Loader2Icon,
  TriangleAlertIcon,
  WalletIcon,
  XCircleIcon,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { SumupCheckoutAttempt } from '@/generated/prisma/client';
import {
  PhotoShootingStatus,
  SumupCheckoutAttemptStatus,
} from '@/generated/prisma/enums';
import { AMOUNT_MISMATCH_REASON, isAttemptOpen } from '@/lib/sumup/reconcile';
import { formatMoney } from '@/lib/utils';
import { recordCashBalancePayment } from '@/server/balance-payment';
import {
  cancelPaymentAttempt,
  createPaymentAttempt,
  forceClosePaymentAttempt,
} from '@/server/payment';

import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

export function BalancePayment({
  remainingAmount,
  currentShootingStatus,
  shootingId,
  openAttemptId,
}: {
  remainingAmount: number;
  currentShootingStatus: PhotoShootingStatus;
  shootingId: string;
  /** Nyitott (INITIATED/PENDING) SumUp kísérlet, ha van: a dialog folytatja. */
  openAttemptId: string | null;
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
    <div className="flex flex-col items-center gap-6 rounded-lg py-6 lg:flex-row lg:justify-between">
      <p className="flex flex-1 items-center gap-2 text-xl font-bold">
        {shouldCollectBalancePayment && (
          <TriangleAlertIcon className="text-amber-500" />
        )}
        <span>
          {remainingAmount > 0 ? 'Még fizetendő' : 'Túlfizetés'}:{' '}
          {formatMoney(remainingAmount)}
        </span>
      </p>
      <div className="flex w-full flex-1 flex-col items-stretch justify-end gap-3 lg:w-auto lg:flex-row lg:items-center">
        {shouldCollectBalancePayment ? (
          <>
            <CashPaymentButton
              remainingAmount={remainingAmount}
              shootingId={shootingId}
            />
            <SumUpPaymentButton
              shootingId={shootingId}
              openAttemptId={openAttemptId}
            />
          </>
        ) : (
          <Alert className="border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-800 dark:text-blue-50">
            <BadgeInfoIcon />
            <AlertTitle>
              A fizetés a fotózás kezdetekor válik elérhetővé.
            </AlertTitle>
            <AlertDescription className="text-blue-700/70 dark:text-blue-50/70">
              Ha valaki mégis korábban szeretne fizetni, mint amikor a fotózás
              van, akkor állítsd korábbra az időpontot.
            </AlertDescription>
          </Alert>
        )}
      </div>
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
              {isSaving ? <Spinner /> : <CoinsIcon />}
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

/** Ennyi egymás utáni sikertelen poll után mutatunk hibát (1,5 mp-enként). */
const MAX_POLL_FAILURES = 5;

type PolledAttempt = SumupCheckoutAttempt & { canForceClose: boolean };

function SumUpPaymentButton({
  shootingId,
  openAttemptId,
}: {
  shootingId: string;
  openAttemptId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const attemptId = useSearchParams().get('attempt');

  const [isStarting, startTransition] = useTransition();
  const [isCancelling, cancelTransition] = useTransition();
  const [isForceClosing, forceCloseTransition] = useTransition();
  const [startError, setStartError] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [polled, setPolled] = useState<PolledAttempt | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);

  // Frissítés vagy visszanavigálás után a nyitott kísérletet folytatjuk, hogy
  // ne lehessen mellette egy másodikat indítani. Kísérletenként egyszer: a
  // bezárás után már ne nyíljon újra a régi (a prop a refreshig elavult).
  const resumedAttemptId = useRef<string | null>(null);
  useEffect(() => {
    if (!openAttemptId || resumedAttemptId.current === openAttemptId) return;
    resumedAttemptId.current = openAttemptId;
    if (attemptId == null) {
      router.replace(`${pathname}?attempt=${openAttemptId}`, { scroll: false });
    }
  }, [openAttemptId, attemptId, pathname, router]);

  // ignore a stale result from a previous attempt
  const attempt = polled?.id === attemptId ? polled : null;
  const isActive = !!attemptId && (!attempt || isAttemptOpen(attempt));
  const shouldPoll = isActive && !startError && !pollError && !isStarting;
  const open = isStarting || !!attemptId || !!startError;
  const locked = isStarting || (isActive && !startError && !pollError);

  function onPay() {
    setStartError(null);
    startTransition(async () => {
      const res = await createPaymentAttempt(shootingId);
      if (res.error != null) return setStartError(res.error);
      router.replace(`${pathname}?attempt=${res.attemptId}`, { scroll: false });
    });
  }

  useEffect(() => {
    if (!shouldPoll) {
      return;
    }
    const controller = new AbortController();
    // Egy-egy kiesés (hálózat, deploy) belefér, de tartós hibánál a dialógus
    // ne pörögjön zárhatatlanul: hibát mutatunk, és bezárhatóvá válik.
    let failures = 0;
    const fail = (message: string) => {
      failures += 1;
      if (failures >= MAX_POLL_FAILURES) setPollError(message);
    };
    const tick = async () => {
      try {
        const res = await fetch(`/api/payment-attempts/${attemptId}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (res.ok) {
          failures = 0;
          setPolled(await res.json());
        } else if (res.status === 404) {
          setStartError('A fizetési kísérlet nem található.');
        } else if (res.status === 401) {
          setPollError('Lejárt a bejelentkezés, jelentkezz be újra.');
        } else {
          fail('A szerver hibát ad, a fizetés állapota nem kérdezhető le.');
        }
      } catch {
        if (!controller.signal.aborted) {
          fail('Nincs kapcsolat, a fizetés állapota nem kérdezhető le.');
        }
      }
    };
    tick();
    const t = setInterval(tick, 1500);

    return () => {
      controller.abort();
      clearInterval(t);
    };
  }, [attemptId, shouldPoll]);

  function onCancel() {
    if (!attemptId) return;
    setCancelError(null);
    cancelTransition(async () => {
      const res = await cancelPaymentAttempt(attemptId);
      // on success the webhook closes the attempt and the next poll shows it
      if (res.error != null) setCancelError(res.error);
    });
  }

  function onForceClose() {
    if (!attemptId) return;
    setCancelError(null);
    forceCloseTransition(async () => {
      const res = await forceClosePaymentAttempt(attemptId);
      // a lezárt állapotot a következő poll hozza
      if (res.error != null) setCancelError(res.error);
    });
  }

  const succeeded = attempt?.status === SumupCheckoutAttemptStatus.SUCCESSFUL;

  function close() {
    if (locked) return;
    setStartError(null);
    setPollError(null);
    router.replace(pathname, { scroll: false });
    // A fizetés után a hátralék 0, a BalancePayment ilyenkor már nem rendereli
    // ezt a gombot, vagyis a dialógust is magával vinné. Ezért csak bezáráskor
    // frissítjük az oldalt, nem a siker pillanatában.
    if (succeeded) router.refresh();
  }

  function renderContent() {
    if (isStarting) {
      return (
        <>
          <DialogHeader>
            <DialogTitle>Fizetés indítása</DialogTitle>
            <DialogDescription>Kapcsolódás a terminálhoz…</DialogDescription>
          </DialogHeader>
          <Loader2Icon className="mx-auto my-6 size-10 animate-spin text-muted-foreground" />
        </>
      );
    }

    if (startError) {
      return (
        <>
          <DialogHeader>
            <DialogTitle>Nem lehetséges a kártyás fizetés</DialogTitle>
            <DialogDescription>{startError}</DialogDescription>
          </DialogHeader>
          <XCircleIcon className="mx-auto my-6 size-10 text-destructive" />
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Bezárás
            </Button>
            <Button onClick={onPay}>Újra</Button>
          </DialogFooter>
        </>
      );
    }

    if (pollError) {
      return (
        <>
          <DialogHeader>
            <DialogTitle>Nem látjuk a fizetés állapotát</DialogTitle>
            <DialogDescription>
              {pollError} A fizetés ettől még átmehet a terminálon: ha átment, a
              frissítés után látszik.
            </DialogDescription>
          </DialogHeader>
          <XCircleIcon className="mx-auto my-6 size-10 text-destructive" />
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Bezárás
            </Button>
            <Button onClick={() => setPollError(null)}>Újrapróbálás</Button>
          </DialogFooter>
        </>
      );
    }

    if (!attempt) {
      return (
        <>
          <DialogHeader>
            <DialogTitle>Fizetés betöltése</DialogTitle>
            <DialogDescription>Egy pillanat…</DialogDescription>
          </DialogHeader>
          <Loader2Icon className="mx-auto my-6 size-10 animate-spin text-muted-foreground" />
        </>
      );
    }

    switch (attempt.status) {
      case SumupCheckoutAttemptStatus.INITIATED:
      case SumupCheckoutAttemptStatus.PENDING:
        return (
          <>
            <DialogHeader>
              <DialogTitle>Várakozás a kártyára</DialogTitle>
              <DialogDescription>
                A SumUp terminálnak most mutatnia kell a helyes összeget:
              </DialogDescription>
            </DialogHeader>
            <div>
              <p className="text-center text-4xl font-bold">
                {formatMoney(attempt.amountInCents)}
              </p>
            </div>
            <Loader2Icon className="mx-auto my-6 size-10 animate-spin text-muted-foreground" />
            {cancelError && (
              <p className="text-center text-sm text-destructive">
                {cancelError}
              </p>
            )}
            {attempt.canForceClose && (
              <p className="text-center text-sm text-muted-foreground">
                A terminál percek óta nem jelzett vissza. Ha biztosan nem ment
                át a fizetés, lezárhatod sikertelenként, és indíthatsz újat.
              </p>
            )}
            <DialogFooter>
              {attempt.canForceClose && (
                <Button
                  variant="outline"
                  onClick={onForceClose}
                  disabled={isForceClosing}
                >
                  {isForceClosing && <Loader2Icon className="animate-spin" />}
                  Lezárás sikertelenként
                </Button>
              )}
              <Button
                variant="destructive"
                onClick={onCancel}
                disabled={isCancelling}
              >
                {isCancelling && <Loader2Icon className="animate-spin" />}
                Megszakítás
              </Button>
            </DialogFooter>
          </>
        );

      case SumupCheckoutAttemptStatus.SUCCESSFUL:
        return (
          <>
            <DialogHeader>
              <DialogTitle>Sikeres fizetés</DialogTitle>
              <DialogDescription className="text-3xl">
                {formatMoney(attempt.amountInCents)} kifizetve.
              </DialogDescription>
            </DialogHeader>
            <CheckCircle2Icon className="mx-auto my-6 size-10 text-green-600" />
            <DialogFooter>
              <Button onClick={close}>Bezárás</Button>
            </DialogFooter>
          </>
        );

      case SumupCheckoutAttemptStatus.FAILED:
        // A pénz megmozdult, csak nem a várt összeggel: újrapróbálás helyett
        // emberi ellenőrzés kell (Discordon már riasztottunk).
        if (attempt.failureReason === AMOUNT_MISMATCH_REASON) {
          return (
            <>
              <DialogHeader>
                <DialogTitle>Ellenőrizni kell a fizetést</DialogTitle>
                <DialogDescription>
                  A terminál más összeget terhelt, mint amit vártunk. Ne indíts
                  új fizetést, amíg valaki meg nem nézte a SumUp felületén.
                </DialogDescription>
              </DialogHeader>
              <TriangleAlertIcon className="mx-auto my-6 size-10 text-amber-500" />
              <DialogFooter>
                <Button variant="outline" onClick={close}>
                  Bezárás
                </Button>
              </DialogFooter>
            </>
          );
        }
        return (
          <>
            <DialogHeader>
              <DialogTitle>Sikertelen fizetés</DialogTitle>
              <DialogDescription>
                {attempt.failureReason ?? 'A terminál elutasította a fizetést.'}
              </DialogDescription>
            </DialogHeader>
            <XCircleIcon className="mx-auto my-6 size-10 text-destructive" />
            <DialogFooter>
              <Button variant="outline" onClick={close}>
                Bezárás
              </Button>
              <Button onClick={onPay}>Újra</Button>
            </DialogFooter>
          </>
        );

      case SumupCheckoutAttemptStatus.CANCELLED:
        return (
          <>
            <DialogHeader>
              <DialogTitle>Fizetés megszakítva</DialogTitle>
              <DialogDescription>Nem történt terhelés.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={close}>
                Bezárás
              </Button>
              <Button onClick={onPay}>Újra</Button>
            </DialogFooter>
          </>
        );
    }
  }

  return (
    <>
      <Button
        className="w-full lg:w-auto"
        size="lg"
        variant="outline"
        onClick={onPay}
        disabled={open}
      >
        <CreditCardIcon />
        Bankkártya
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => !next && close()}
        disablePointerDismissal
      >
        <DialogContent showCloseButton={!locked}>
          {renderContent()}
        </DialogContent>
      </Dialog>
    </>
  );
}
