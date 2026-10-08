'use client';

import { Controller } from 'react-hook-form';

import { StartTimeDrawer } from '@/components/StartTimeDrawer';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  useRemoteBookingForm,
  type RemoteBookingFormValues,
} from '@/hooks/use-remote-booking-form';
import { ALL_DECOR_SETS, ALL_PACKAGES } from '@/lib/catalog';
import { MAX_PERSONS, MAX_PETS } from '@/lib/constants';
import { shortFullDateFormatter } from '@/lib/formatters';
import { createRemoteBookingIntent } from '@/server/remote-booking';

const NOTE_MAX_LENGTH = 500;

export function RemoteBookingForm() {
  const { form, isSingleDecorPackage, lightLocked } = useRemoteBookingForm();

  async function onSubmit(values: RemoteBookingFormValues) {
    const result = await createRemoteBookingIntent({
      startTime: values.startTime,
      name: values.name,
      email: values.email,
      packageKey: values.packageKey!,
      decorSetKey: isSingleDecorPackage ? values.decorKey : null,
      isLightPlaySelected: values.isLightPlaySelected,
      numberOfGuests: values.numberOfPeople,
      numberOfPets: values.numberOfPets,
      clientNote: values.customerNote.trim() || null,
      optOutFromMarketingEmails: values.optOutFromMarketingEmails,
    });

    form.setError('root', { message: result.error });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="pb-24">
        <Controller
          name="startTime"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <StartTimeDrawer
                value={field.value}
                confirmLabel="Kész"
                onConfirm={field.onChange}
                trigger={
                  <Button type="button" size="lg" variant="outline">
                    {field.value
                      ? shortFullDateFormatter.format(field.value)
                      : 'Válassz időpontot!'}
                  </Button>
                }
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="remote-booking-name">Név</FieldLabel>
              <Input
                {...field}
                id="remote-booking-name"
                autoComplete="name"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="remote-booking-email">E-mail cím</FieldLabel>
              <Input
                {...field}
                id="remote-booking-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="optOutFromMarketingEmails"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} orientation="horizontal">
              <Checkbox
                id="opt-out-from-marketing-emails"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
              <FieldLabel htmlFor="opt-out-from-marketing-emails">
                Nem kér marketing emaileket
              </FieldLabel>
            </Field>
          )}
        />

        <Controller
          name="packageKey"
          control={form.control}
          render={({ field, fieldState }) => (
            <FieldSet data-invalid={fieldState.invalid}>
              <FieldLegend>Csomag</FieldLegend>
              <RadioGroup
                value={field.value ?? null}
                onValueChange={field.onChange}
                aria-invalid={fieldState.invalid}
              >
                {Object.values(ALL_PACKAGES).map((pkg) => (
                  <FieldLabel key={pkg.key} htmlFor={`package-${pkg.slug}`}>
                    <Field orientation="horizontal">
                      {pkg.label}
                      <RadioGroupItem
                        value={pkg.key}
                        id={`package-${pkg.slug}`}
                      />
                    </Field>
                  </FieldLabel>
                ))}
              </RadioGroup>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </FieldSet>
          )}
        />

        {isSingleDecorPackage && (
          <Controller
            name="decorKey"
            control={form.control}
            render={({ field, fieldState }) => (
              <FieldSet data-invalid={fieldState.invalid}>
                <FieldLegend>Díszlet</FieldLegend>
                <RadioGroup
                  value={field.value ?? null}
                  onValueChange={field.onChange}
                  aria-invalid={fieldState.invalid}
                >
                  {ALL_DECOR_SETS.map((set) => (
                    <FieldLabel key={set.key} htmlFor={`decor-${set.key}`}>
                      <Field orientation="horizontal">
                        {set.label}
                        <RadioGroupItem
                          value={set.key}
                          id={`decor-${set.key}`}
                        />
                      </Field>
                    </FieldLabel>
                  ))}
                </RadioGroup>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </FieldSet>
            )}
          />
        )}

        <Controller
          name="isLightPlaySelected"
          control={form.control}
          render={({ field }) => (
            <FieldLabel htmlFor="remote-booking-light-play">
              <Field orientation="horizontal">
                Fényjáték
                <Switch
                  id="remote-booking-light-play"
                  checked={lightLocked || field.value}
                  disabled={lightLocked}
                  onCheckedChange={field.onChange}
                />
              </Field>
            </FieldLabel>
          )}
        />

        <Controller
          name="numberOfPeople"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="remote-booking-people">
                Vendégek száma
              </FieldLabel>
              <Input
                id="remote-booking-people"
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_PERSONS}
                value={field.value}
                onChange={(event) => field.onChange(event.target.valueAsNumber)}
                onBlur={field.onBlur}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="numberOfPets"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="remote-booking-pets">
                Kisállatok száma
              </FieldLabel>
              <Input
                id="remote-booking-pets"
                type="number"
                inputMode="numeric"
                min={0}
                max={MAX_PETS}
                value={field.value}
                onChange={(event) => field.onChange(event.target.valueAsNumber)}
                onBlur={field.onBlur}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="customerNote"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="remote-booking-note">Megjegyzés</FieldLabel>
              <Textarea
                {...field}
                id="remote-booking-note"
                maxLength={NOTE_MAX_LENGTH}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <Button
          type="submit"
          size="lg"
          disabled={form.formState.isSubmitting}
          className="mx-auto flex w-full lg:w-3xl"
        >
          {form.formState.isSubmitting ? <Spinner /> : 'Foglalás rögzítése'}
        </Button>
        {form.formState.errors.root != null && (
          <p className="mx-auto mt-2 max-w-3xl text-center text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}
      </div>
    </form>
  );
}
