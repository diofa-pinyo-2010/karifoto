'use client';

import Link from 'next/link';
import { useActionState, useRef, useState } from 'react';

import { REGEXP_ONLY_DIGITS } from 'input-otp';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldError, FieldGroup } from '@/components/ui/field';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { REDIRECT_URL_PARAM } from '@/lib/session';
import { verifyLoginCode } from '@/server/admin-auth';

import type { VerifyCodeState } from '@/server/admin-auth';

export function VerifyForm({ redirectUrl }: { redirectUrl: string | null }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [code, setCode] = useState('');

  // On success the action redirects and never returns; any returned state is
  // an error, after which the field starts empty for the next try.
  const [state, action, pending] = useActionState(
    async (prevState: VerifyCodeState, formData: FormData) => {
      const result = await verifyLoginCode(prevState, formData);
      setCode('');
      return result;
    },
    undefined,
  );

  const loginHref = redirectUrl
    ? `/admin/login?${new URLSearchParams({ [REDIRECT_URL_PARAM]: redirectUrl })}`
    : '/admin/login';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <Card>
          <CardContent>
            <form ref={formRef} action={action}>
              <FieldGroup>
                {redirectUrl && (
                  <input
                    type="hidden"
                    name={REDIRECT_URL_PARAM}
                    value={redirectUrl}
                  />
                )}
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-semibold">Írd be a kódot</h1>
                  <p className="text-balance text-muted-foreground">
                    Ha ez az e-mail cím regisztrálva van, elküldtük rá a
                    belépési kódot. 10 percig érvényes.
                  </p>
                  <p className="text-sm text-balance text-muted-foreground">
                    Új kódot legfeljebb percenként kérhetsz.
                  </p>
                </div>
                <Field className="items-center">
                  <InputOTP
                    name="code"
                    maxLength={8}
                    pattern={REGEXP_ONLY_DIGITS}
                    value={code}
                    onChange={setCode}
                    onComplete={() => formRef.current?.requestSubmit()}
                    disabled={pending}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                      <InputOTPSlot index={6} />
                      <InputOTPSlot index={7} />
                    </InputOTPGroup>
                  </InputOTP>
                  {state?.error && (
                    <FieldError className="text-center">
                      {state.error}
                    </FieldError>
                  )}
                </Field>
                <Field>
                  <Button type="submit" disabled={pending}>
                    {pending ? 'Belépés...' : 'Belépés'}
                  </Button>
                </Field>
                <p className="text-center text-sm text-muted-foreground">
                  Nem jött meg a kód?{' '}
                  <Link
                    href={loginHref}
                    className="text-foreground underline underline-offset-4"
                  >
                    Új kód kérése
                  </Link>
                </p>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
