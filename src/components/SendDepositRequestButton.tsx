'use client';

import { useState, useTransition } from 'react';

import { CheckIcon, MailIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { sendDepositRequest } from '@/server/deposit-request';

export function SendDepositRequestButton({
  bookingIntentId,
  initiallySent,
  isBookingIntentConverted,
}: {
  bookingIntentId: string;
  initiallySent: boolean;
  isBookingIntentConverted: boolean;
}) {
  const [sent, setSent] = useState(initiallySent);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await sendDepositRequest(bookingIntentId);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setSent(true);
    });
  }

  return (
    <>
      <Button
        type="button"
        size="lg"
        disabled={pending || sent || isBookingIntentConverted}
        onClick={handleClick}
        className="mx-auto flex w-full lg:w-3xl"
      >
        {pending ? (
          <Spinner />
        ) : sent ? (
          <>
            <CheckIcon />
            Előlegbekérő elküldve
          </>
        ) : (
          <>
            <MailIcon />
            Előlegbekérő kiküldése
          </>
        )}
      </Button>
      {error != null && (
        <p className="mx-auto mt-2 max-w-3xl text-center text-sm text-destructive">
          {error}
        </p>
      )}
    </>
  );
}
