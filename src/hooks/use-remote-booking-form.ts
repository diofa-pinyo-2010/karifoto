'use client';

import { useForm, useWatch } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { MAX_PERSONS, MAX_PETS } from '@/lib/constants';
import {
  packages,
  SET_ORDER,
  type DecorSetKey,
  type PackageKey,
} from '@/lib/data';

const NOTE_MAX_LENGTH = 500;

/** A Mini csomagban egy díszletet lehet választani, a többiben mindkettő jár. */
const SINGLE_DECOR_PACKAGE: PackageKey = 'mini';

/** A Family csomagban a fényjáték benne van, nem külön kérhető extra. */
const LIGHT_INCLUDED_PACKAGE: PackageKey = 'family';

const PACKAGE_KEYS = packages.map((p) => p.id) as [PackageKey, ...PackageKey[]];
const DECOR_KEYS = SET_ORDER as [DecorSetKey, ...DecorSetKey[]];

const remoteBookingSchema = z
  .object({
    startTime: z.date({ error: 'Add meg az időpontot.' }),
    name: z.string().trim().min(2, 'Add meg a teljes nevet.'),
    email: z.email('Adj meg érvényes e-mail címet.'),
    packageKey: z.enum(PACKAGE_KEYS).nullable(),
    decorKey: z.enum(DECOR_KEYS).nullable(),
    isLightPlaySelected: z.boolean(),
    numberOfPeople: z.number().int().min(1, 'Legalább 1 fő.').max(MAX_PERSONS),
    numberOfPets: z.number().int().min(0).max(MAX_PETS),
    customerNote: z.string().max(NOTE_MAX_LENGTH),
  })
  .superRefine((values, ctx) => {
    if (values.packageKey == null) {
      ctx.addIssue({
        code: 'custom',
        path: ['packageKey'],
        message: 'Válassz csomagot.',
      });
    }
    if (values.packageKey === SINGLE_DECOR_PACKAGE && values.decorKey == null) {
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
    },
  });

  const packageKey = useWatch({ control: form.control, name: 'packageKey' });
  const isSingleDecorPackage = packageKey === SINGLE_DECOR_PACKAGE;
  const lightLocked = packageKey === LIGHT_INCLUDED_PACKAGE;

  return { form, isSingleDecorPackage, lightLocked };
}
