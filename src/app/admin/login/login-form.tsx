'use client';

import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { REDIRECT_URL_PARAM } from '@/lib/session';
import { requestLoginCode } from '@/server/admin-auth';

export function LoginForm({ redirectUrl }: { redirectUrl: string | null }) {
  const [state, action, pending] = useActionState(requestLoginCode, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <Card>
          <CardContent>
            <form action={action}>
              <FieldGroup>
                {redirectUrl && (
                  <input
                    type="hidden"
                    name={REDIRECT_URL_PARAM}
                    value={redirectUrl}
                  />
                )}
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-semibold">Admin belépés</h1>
                  <p className="text-balance text-muted-foreground">
                    Add meg az e-mail címed, és küldünk egy belépési kódot.
                  </p>
                </div>
                <Field>
                  <FieldLabel htmlFor="email">E-mail cím</FieldLabel>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="admin@example.com"
                    autoComplete="off"
                    required
                  />
                </Field>
                <Field>
                  <Button type="submit" disabled={pending}>
                    {pending ? 'Küldés...' : 'Belépési kód küldése'}
                  </Button>
                </Field>
                {state?.error && (
                  <FieldError className="text-center">{state.error}</FieldError>
                )}
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
