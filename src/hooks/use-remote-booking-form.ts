'use client';

import { useForm, useWatch } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { DecorSet, Package } from '@/generated/prisma/enums';
import { packageIncludesAddOn, requiresDecorChoice } from '@/lib/catalog';
import { MAX_PERSONS, MAX_PETS } from '@/lib/constants';

const NOTE_MAX_LENGTH = 500;

const remoteBookingSchema = z
  .object({
    startTime: z.date({ error: 'Add meg az időpontot.' }),
    name: z.string().trim().min(2, 'Add meg a teljes nevet.'),
    email: z.email('Adj meg érvényes e-mail címet.'),
    packageKey: z.enum(Package).nullable(),
    decorKey: z.enum(DecorSet).nullable(),
    isLightPlaySelected: z.boolean(),
    numberOfPeople: z.number().int().min(1, 'Legalább 1 fő.').max(MAX_PERSONS),
    numberOfPets: z.number().int().min(0).max(MAX_PETS),
    customerNote: z.string().max(NOTE_MAX_LENGTH),
    optOutFromMarketingEmails: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.packageKey == null) {
      ctx.addIssue({
        code: 'custom',
        path: ['packageKey'],
        message: 'Válassz csomagot.',
      });
    }
    if (
      values.packageKey != null &&
      requiresDecorChoice(values.packageKey) &&
      values.decorKey == null
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['decorKey'],
        message: 'Válassz díszletet.',
      });
    }
  });

export type RemoteBookingFormValues = z.infer<typeof remoteBookingSchema>;

export function useRemoteBookingForm() {
  const form = useForm<RemoteBookingFormValues>({
    resolver: zodResolver(remoteBookingSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      startTime: undefined,
      name: '',
      email: '',
      packageKey: null,
      decorKey: null,
      isLightPlaySelected: false,
      numberOfPeople: 1,
      numberOfPets: 0,
      customerNote: '',
      optOutFromMarketingEmails: false,
    },
  });

  const packageKey = useWatch({ control: form.control, name: 'packageKey' });
  const isSingleDecorPackage =
    packageKey != null && requiresDecorChoice(packageKey);
  const lightLocked =
    packageKey != null && packageIncludesAddOn(packageKey, 'LIGHT_PLAY');

  return { form, isSingleDecorPackage, lightLocked };
}
