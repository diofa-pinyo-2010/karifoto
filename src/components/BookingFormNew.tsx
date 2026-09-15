'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import {
  Controller,
  useForm,
  useWatch,
  type FieldErrors,
  type RefCallBack,
} from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { MinusIcon, PlusIcon } from 'lucide-react';
import * as z from 'zod';

import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  LIGHT_PLAY_FEE,
  MAX_PERSONS,
  MAX_PETS,
  PERSONS_INCLUDED,
} from '@/lib/constants';
import {
  PACKAGE_HIGHLIGHT_BADGE,
  packages,
  photoSets,
  photoShootingSets,
  SET_ORDER,
  type DecorSetKey,
  type PackageKey,
} from '@/lib/data';
import { formatMoney } from '@/lib/utils';
import { createBookingIntent } from '@/server/booking-intent';

import type { BookingSelection } from '@/lib/booking-selection';

const NOTE_MAX_LENGTH = 500;

/** A Mini csomagban egy díszletet lehet választani, a többiben mindkettő jár. */
const SINGLE_DECOR_PACKAGE: PackageKey = 'mini';

/** A Family csomagban a fényjáték benne van, nem külön kérhető extra. */
const LIGHT_INCLUDED_PACKAGE: PackageKey = 'family';

const PACKAGE_KEYS = packages.map((p) => p.id) as [PackageKey, ...PackageKey[]];
const DECOR_KEYS = SET_ORDER as [DecorSetKey, ...DecorSetKey[]];

const DECOR_TAGLINES = Object.fromEntries(
  photoSets
    .filter((set) => set.key != null)
    .map((set) => [set.key, set.tagline]),
) as Record<DecorSetKey, string>;

/**
 * Választható kártya. A kiválasztott állapot erdőzöld — a shadcn alapértelmezett
 * `primary` pirosas, és a terrakotta is az, így a hibaállapottól nem lenne
 * megkülönböztethető.
 */
const CHOICE_CARD_CLASS = [
  'rounded-2xl bg-white/62 shadow-[0_1px_3px_rgba(20,51,42,.06)] transition-colors',
  'has-[>[data-slot=field]]:rounded-2xl has-[>[data-slot=field]]:border-ink/20',
  '*:data-[slot=field]:p-4',
  'has-[>[data-slot=field]]:not-has-[:disabled,[data-disabled]]:hover:bg-white/80',
  'has-data-checked:border-forest has-data-checked:bg-forest/8 has-data-checked:ring-1 has-data-checked:ring-forest/30',
].join(' ');

/** Rádiógomb / checkbox a kártyákon — nagyobb fogófelület, erdőzöld kitöltés. */
const CHOICE_CONTROL_CLASS = [
  'size-5 border-ink/30',
  'data-checked:border-forest data-checked:bg-forest data-checked:text-cream',
  'group-has-[:focus-visible]/field-label:data-checked:border-forest',
  'focus-visible:border-forest focus-visible:ring-forest/30',
].join(' ');

/** A sticky header magassága, hogy a hibára görgetés ne csússzon alá. */
const SECTION_CLASS = 'scroll-mt-24';

const LEGEND_CLASS = 'font-display text-2xl font-medium text-ink';
const HINT_CLASS = 'text-base font-light text-cream-muted';
const TEXT_CONTROL_CLASS = 'h-12 bg-white/62 text-base';

const bookingFormSchema = z
  .object({
    packageKey: z.enum(PACKAGE_KEYS).nullable(),
    decorKey: z.enum(DECOR_KEYS).nullable(),
    isLightPlaySelected: z.boolean(),
    numberOfPeople: z
      .number()
      .int()
      .min(1, 'Legalább 1 fő :)')
      .max(MAX_PERSONS),
    numberOfPets: z.number().int().min(0).max(MAX_PETS),
    customerNote: z.string().max(NOTE_MAX_LENGTH),
    name: z.string().trim().min(2, 'Add meg a neved.'),
    email: z.email('Adj meg egy érvényes e-mail címet.'),
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

type BookingFormValues = z.infer<typeof bookingFormSchema>;
type FieldName = keyof BookingFormValues;

/** Sikertelen beküldésnél ebben a sorrendben keressük az első hibás mezőt. */
const FIELD_ORDER = [
  'packageKey',
  'decorKey',
  'isLightPlaySelected',
  'numberOfPeople',
  'numberOfPets',
  'name',
  'email',
  'customerNote',
] as const satisfies readonly FieldName[];

export function BookingFormNew({
  timeSlotId,
  selection,
}: {
  timeSlotId: string;
  selection: BookingSelection;
}) {
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    // A beépített fókuszálás a *mezőt* görgetné a viewport szélére, így a
    // szekció címe a sticky header alá csúszna. Helyette az onInvalid görget.
    shouldFocusError: false,
    defaultValues: {
      // A főoldalról hozott választások csak előkitöltenek — itt is módosíthatók.
      packageKey: selection.packageKey,
      decorKey: selection.decorKey,
      isLightPlaySelected: selection.light,
      numberOfPeople: 0,
      numberOfPets: 0,
      customerNote: '',
      name: '',
      email: '',
    },
  });

  const packageKey = useWatch({ control: form.control, name: 'packageKey' });
  const isSingleDecorPackage = packageKey === SINGLE_DECOR_PACKAGE;
  const decorLocked = packageKey != null && !isSingleDecorPackage;
  const lightLocked = packageKey === LIGHT_INCLUDED_PACKAGE;

  const router = useRouter();
  const [navigating, setNavigating] = useState(false);
  const pending = form.formState.isSubmitting || navigating;

  const sectionRefs = useRef<Partial<Record<FieldName, HTMLElement | null>>>(
    {},
  );
  const controlRefs = useRef<Partial<Record<FieldName, HTMLElement | null>>>(
    {},
  );

  const sectionRef = (name: FieldName) => (node: HTMLElement | null) => {
    sectionRefs.current[name] = node;
  };

  /** A saját ref-ünk (fókuszáláshoz) és az RHF ref-je ugyanarra az elemre. */
  const controlRef =
    (name: FieldName, fieldRef: RefCallBack) => (node: HTMLElement | null) => {
      controlRefs.current[name] = node;
      fieldRef(node);
    };

  function onInvalid(errors: FieldErrors<BookingFormValues>) {
    const first = FIELD_ORDER.find((name) => errors[name]);
    if (first == null) return;

    sectionRefs.current[first]?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
    // A görgetés animációja alatt fókuszálunk, különben a fókusz visszarántaná.
    requestAnimationFrame(() => {
      controlRefs.current[first]?.focus({ preventScroll: true });
    });
  }

  /**
   * A Server Action sima async függvény, így a kliensről hívható. A `handleSubmit`
   * miatt csak sikeres kliensoldali validáció után fut le — `<form action={...}>`
   * esetén azonnal elindulna, és elveszne a zod-validáció.
   */
  async function onSubmit(values: BookingFormValues) {
    const result = await createBookingIntent({
      timeSlotId,
      packageKey: values.packageKey!,
      // Csak a Mini csomagnál választ a vendég díszletet, különben mindkettő jár.
      decorSetKey: isSingleDecorPackage ? values.decorKey : null,
      isLightPlaySelected: lightLocked || values.isLightPlaySelected,
      numberOfGuests: values.numberOfPeople,
      numberOfPets: values.numberOfPets,
      clientNote: values.customerNote.trim() || null,
      name: values.name.trim(),
      email: values.email.trim(),
    });

    if ('error' in result) {
      form.setError('root', { message: result.error });
      return;
    }

    // A navigáció alatt is letiltva marad a gomb, hogy ne jöjjön létre két intent.
    setNavigating(true);
    router.push(`/foglalas-osszegzese/${result.id}`);
  }

  return (
    <form
      id="booking-form"
      onSubmit={form.handleSubmit(onSubmit, onInvalid)}
      noValidate
      className="mx-auto max-w-130 px-4.5 pt-8 pb-10 sm:px-10"
    >
      <FieldGroup className="gap-9">
        <Controller
          name="packageKey"
          control={form.control}
          render={({ field, fieldState }) => (
            <FieldSet
              ref={sectionRef('packageKey')}
              data-invalid={fieldState.invalid}
              className={SECTION_CLASS}
            >
              <FieldLegend className={LEGEND_CLASS}>
                Csomag<span className="ml-1 text-terracotta">*</span>
              </FieldLegend>
              <FieldDescription className={HINT_CLASS}>
                Válaszd ki, melyik csomaggal fotózunk.
              </FieldDescription>
              <RadioGroup
                value={field.value ?? null}
                onValueChange={(value) => field.onChange(value as PackageKey)}
                aria-invalid={fieldState.invalid}
                className="gap-3"
              >
                {packages.map((pkg, index) => (
                  <FieldLabel
                    key={pkg.id}
                    htmlFor={`package-${pkg.id}`}
                    className={CHOICE_CARD_CLASS}
                  >
                    <Field orientation="horizontal">
                      <FieldContent className="gap-1">
                        <FieldTitle className="text-lg text-ink">
                          {pkg.name}
                          {pkg.highlighted && (
                            <span className="rounded-full bg-gold/25 px-2 py-0.5 text-[11px] tracking-chip text-ink uppercase">
                              {PACKAGE_HIGHLIGHT_BADGE}
                            </span>
                          )}
                        </FieldTitle>
                        <FieldDescription className="text-base text-cream-muted">
                          {pkg.sub}
                        </FieldDescription>
                        <FieldDescription className="mt-1 text-base text-ink">
                          <span className="font-medium">{pkg.price}</span>{' '}
                          <span className="text-cream-dim">
                            {pkg.studioFee}
                          </span>
                        </FieldDescription>
                      </FieldContent>
                      <RadioGroupItem
                        ref={
                          index === 0
                            ? controlRef('packageKey', field.ref)
                            : undefined
                        }
                        value={pkg.id}
                        id={`package-${pkg.id}`}
                        aria-invalid={fieldState.invalid}
                        className={CHOICE_CONTROL_CLASS}
                      />
                    </Field>
                  </FieldLabel>
                ))}
              </RadioGroup>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </FieldSet>
          )}
        />

        <Controller
          name="decorKey"
          control={form.control}
          render={({ field, fieldState }) => (
            <FieldSet
              ref={sectionRef('decorKey')}
              data-invalid={fieldState.invalid}
              className={SECTION_CLASS}
            >
              <FieldLegend className={LEGEND_CLASS}>
                Díszlet
                {!decorLocked && (
                  <span className="ml-1 text-terracotta">*</span>
                )}
              </FieldLegend>
              <FieldDescription className={HINT_CLASS}>
                {decorLocked
                  ? 'Ebben a csomagban mindkét díszletben fotózunk.'
                  : 'A Mini csomaghoz egy díszletet választhatsz.'}
              </FieldDescription>

              {decorLocked ? (
                <div className="grid w-full gap-3">
                  {SET_ORDER.map((key) => (
                    <FieldLabel
                      key={key}
                      htmlFor={`decor-${key}`}
                      className={CHOICE_CARD_CLASS}
                    >
                      <Field orientation="horizontal">
                        <FieldContent className="gap-1">
                          <FieldTitle className="text-lg text-ink">
                            {photoShootingSets[key].name}
                          </FieldTitle>
                          <FieldDescription className="text-base text-cream-muted">
                            {DECOR_TAGLINES[key]} · a csomag része
                          </FieldDescription>
                        </FieldContent>
                        <Checkbox
                          id={`decor-${key}`}
                          checked
                          disabled
                          className={`${CHOICE_CONTROL_CLASS} disabled:opacity-100`}
                        />
                      </Field>
                    </FieldLabel>
                  ))}
                </div>
              ) : (
                <RadioGroup
                  value={field.value ?? null}
                  onValueChange={(value) =>
                    field.onChange(value as DecorSetKey)
                  }
                  aria-invalid={fieldState.invalid}
                  className="gap-3"
                >
                  {SET_ORDER.map((key, index) => (
                    <FieldLabel
                      key={key}
                      htmlFor={`decor-${key}`}
                      className={CHOICE_CARD_CLASS}
                    >
                      <Field orientation="horizontal">
                        <FieldContent className="gap-1">
                          <FieldTitle className="text-lg text-ink">
                            {photoShootingSets[key].name}
                          </FieldTitle>
                          <FieldDescription className="text-base text-cream-muted">
                            {DECOR_TAGLINES[key]}
                          </FieldDescription>
                        </FieldContent>
                        <RadioGroupItem
                          ref={
                            index === 0
                              ? controlRef('decorKey', field.ref)
                              : undefined
                          }
                          value={key}
                          id={`decor-${key}`}
                          aria-invalid={fieldState.invalid}
                          className={CHOICE_CONTROL_CLASS}
                        />
                      </Field>
                    </FieldLabel>
                  ))}
                </RadioGroup>
              )}
              {!decorLocked && fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </FieldSet>
          )}
        />

        <Controller
          name="isLightPlaySelected"
          control={form.control}
          render={({ field }) => (
            <FieldSet>
              <FieldLegend className={LEGEND_CLASS}>Fényjáték</FieldLegend>
              <FieldDescription className={HINT_CLASS}>
                Sötét tónusú, meghitt extra képek — a fotózás végén készítjük
                őket.
              </FieldDescription>
              <FieldLabel htmlFor="light-play" className={CHOICE_CARD_CLASS}>
                <Field orientation="horizontal">
                  <FieldContent className="gap-1">
                    <FieldTitle className="text-lg text-ink">
                      Kérem a fényjátékos képeket
                    </FieldTitle>
                    <FieldDescription className="text-base text-cream-muted">
                      {lightLocked
                        ? 'A csomag része'
                        : `+${formatMoney(LIGHT_PLAY_FEE)}`}
                    </FieldDescription>
                  </FieldContent>
                  <Checkbox
                    id="light-play"
                    checked={lightLocked || field.value}
                    disabled={lightLocked}
                    onCheckedChange={field.onChange}
                    className={`${CHOICE_CONTROL_CLASS} disabled:opacity-100`}
                  />
                </Field>
              </FieldLabel>
            </FieldSet>
          )}
        />

        <Controller
          name="numberOfPeople"
          control={form.control}
          render={({ field, fieldState }) => {
            const missingPeople = field.value === 0;
            return (
              <Field
                ref={sectionRef('numberOfPeople')}
                data-invalid={fieldState.invalid}
                className={SECTION_CLASS}
              >
                <FieldTitle className={LEGEND_CLASS}>
                  Hányan jönnétek?
                  <span className="ml-1 text-terracotta">*</span>
                </FieldTitle>
                <FieldDescription className={HINT_CLASS}>
                  {`Az ${PERSONS_INCLUDED} fő fölötti vendégekért felárat számolunk.`}
                </FieldDescription>
                <Stepper
                  inputRef={controlRef('numberOfPeople', field.ref)}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  min={0}
                  max={MAX_PERSONS}
                  display={missingPeople ? '–' : String(field.value)}
                  unit="fő"
                  ariaLabel="Hányan jönnétek"
                  invalid={fieldState.invalid}
                />
                <div
                  className={`mt-1 flex items-center gap-2.25 rounded-2xl border px-3.5 py-2.75 text-[13.5px] leading-[1.45] ${
                    missingPeople
                      ? 'border-terracotta/35 bg-terracotta/[.07] text-[#8F3A26]'
                      : 'border-[#1D4B3C]/25 bg-[#1D4B3C]/6 text-[#2F5D45]'
                  }`}
                >
                  <span className="flex-none">{missingPeople ? '✱' : '✓'}</span>
                  <span>
                    {missingPeople
                      ? 'Legalább 1 fő :)'
                      : `Megvan! ${field.value === 1 ? 'egy' : field.value} főre készülünk.`}{' '}
                    {field.value > PERSONS_INCLUDED &&
                      `(${field.value - PERSONS_INCLUDED} extra fő)`}
                  </span>
                </div>
              </Field>
            );
          }}
        />

        <Controller
          name="numberOfPets"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldTitle className={LEGEND_CLASS}>
                Hoztok-e kisállatot?
              </FieldTitle>
              <FieldDescription className={HINT_CLASS}>
                Kutya, cica, nyuszi is jöhet — kisállatonként felárat számolunk.
              </FieldDescription>
              <Stepper
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                min={0}
                max={MAX_PETS}
                display={String(field.value)}
                unit="kedvenc"
                ariaLabel="Hoztok-e kisállatot"
                invalid={fieldState.invalid}
              />
            </Field>
          )}
        />

        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field
              ref={sectionRef('name')}
              data-invalid={fieldState.invalid}
              className={SECTION_CLASS}
            >
              <FieldLabel htmlFor="booking-name" className={LEGEND_CLASS}>
                Neved<span className="ml-1 text-terracotta">*</span>
              </FieldLabel>
              <Input
                {...field}
                ref={controlRef('name', field.ref)}
                id="booking-name"
                autoComplete="name"
                placeholder="Kovács Anna"
                aria-invalid={fieldState.invalid}
                className={TEXT_CONTROL_CLASS}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field
              ref={sectionRef('email')}
              data-invalid={fieldState.invalid}
              className={SECTION_CLASS}
            >
              <FieldLabel htmlFor="booking-email" className={LEGEND_CLASS}>
                E-mail címed<span className="ml-1 text-terracotta">*</span>
              </FieldLabel>
              <Input
                {...field}
                ref={controlRef('email', field.ref)}
                id="booking-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="anna@example.com"
                aria-invalid={fieldState.invalid}
                className={TEXT_CONTROL_CLASS}
              />
              <FieldDescription className={HINT_CLASS}>
                Ide küldjük a visszaigazolást.
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="customerNote"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="booking-note" className={LEGEND_CLASS}>
                Megjegyzés
              </FieldLabel>
              <FieldDescription className={HINT_CLASS}>
                Bármi, amit jó, ha tudunk: babakocsi, allergia, kedvenc pléd,
                ünnepi szett.
              </FieldDescription>
              <InputGroup className="bg-white/62">
                <InputGroupTextarea
                  {...field}
                  id="booking-note"
                  rows={4}
                  maxLength={NOTE_MAX_LENGTH}
                  placeholder="Írd ide a megjegyzésed…"
                  className="min-h-24 text-base"
                  aria-invalid={fieldState.invalid}
                />
                <InputGroupAddon align="block-end">
                  <InputGroupText className="ml-auto tabular-nums">
                    {field.value.length} / {NOTE_MAX_LENGTH}
                  </InputGroupText>
                </InputGroupAddon>
              </InputGroup>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-cream/15 bg-forest/78 px-4 pt-3.5 pb-[calc(14px+env(safe-area-inset-bottom))] shadow-[0_-12px_32px_rgba(20,51,42,.16)] backdrop-blur-xl sm:px-10">
        <div className="mx-auto flex max-w-180 justify-center sm:justify-end">
          <button
            type="submit"
            form="booking-form"
            disabled={pending}
            className={`w-full max-w-90 rounded-full px-5 py-4.25 text-base font-medium transition-colors ${
              pending
                ? 'cursor-not-allowed bg-cream/12 text-[#7C9083]'
                : 'bg-terracotta text-[#FFF4E6] shadow-[0_14px_32px_rgba(184,80,58,.3)] hover:bg-terracotta-hover'
            }`}
          >
            {pending ? 'Feldolgozás…' : 'Tovább →'}
          </button>
        </div>
        {form.formState.errors.root != null ? (
          <div className="mx-auto mt-2.5 max-w-180 text-center text-[13px] text-terracotta sm:text-right">
            {form.formState.errors.root.message}
          </div>
        ) : (
          form.formState.isSubmitted &&
          !form.formState.isValid && (
            <div className="mx-auto mt-2.5 max-w-180 text-center text-[13px] text-terracotta sm:text-right">
              Nézd át a pirossal jelölt mezőket.
            </div>
          )
        )}
      </div>
    </form>
  );
}

/** Mobilbarát +/− számláló — nagy fogófelület, nem kell hozzá billentyűzet. */
function Stepper({
  inputRef,
  value,
  onChange,
  onBlur,
  min,
  max,
  display,
  unit,
  ariaLabel,
  invalid,
}: {
  inputRef?: React.Ref<HTMLInputElement>;
  value: number;
  onChange: (value: number) => void;
  onBlur: () => void;
  min: number;
  max: number;
  display: string;
  unit: string;
  ariaLabel: string;
  invalid?: boolean;
}) {
  return (
    // Az InputGroup `has-disabled:` stílusa a *vezérlő* letiltására való; itt a
    // +/− gomb tiltódik a határértéknél, ezért az egész sáv szürkülne el.
    <InputGroup className="h-14 border-ink/20 bg-white/62 has-disabled:bg-white/62 has-disabled:opacity-100">
      <InputGroupAddon align="inline-start">
        <InputGroupButton
          size="icon-sm"
          aria-label={`${ariaLabel} — csökkentés`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <MinusIcon className="size-7" />
        </InputGroupButton>
      </InputGroupAddon>
      <InputGroupInput
        ref={inputRef}
        readOnly
        value={`${display} ${unit}`}
        onBlur={onBlur}
        aria-label={ariaLabel}
        aria-invalid={invalid}
        className="text-center text-lg text-ink"
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-sm"
          aria-label={`${ariaLabel} — növelés`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          <PlusIcon className="size-7" />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
