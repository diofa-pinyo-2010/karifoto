'use client';

import { useState } from 'react';

import { CheckIcon, CircleQuestionMarkIcon, XIcon } from 'lucide-react';

import { ResponsiveDialog } from '@/components/ResponsiveDialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { buildFeatures, buildSub, PACKAGES } from '@/lib/catalog';
import { formatMoney } from '@/lib/utils';

import type { Package } from '@/generated/prisma/enums';

export function PackageInfoDialog({ packageKey }: { packageKey: Package }) {
  const [open, setOpen] = useState(false);
  const pkg = PACKAGES[packageKey];
  const { features, footnotes } = buildFeatures(pkg);

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={setOpen}
      showCloseButton
      title="Csomag részletei"
      description={`Mit tartalmaz a ${pkg.label} csomag?`}
      trigger={
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={`${pkg.label} csomag részletei`}
          // A gomb a csomag-kártya <label>-jében van: ne válassza ki a csomagot.
          onClick={(event) => event.stopPropagation()}
        >
          <CircleQuestionMarkIcon />
        </Button>
      }
    >
      <Card className="bg-white/62 ring-ink/15">
        <CardHeader>
          <CardTitle className="font-display text-xl text-ink">
            {pkg.label}
          </CardTitle>
          <CardDescription className="text-cream-muted">
            {buildSub(pkg)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="flex flex-col gap-2">
            {features.map((feature) => (
              <li
                key={feature.text}
                className={`flex items-start gap-2 text-base ${
                  feature.included ? 'text-ink' : 'text-cream-dim line-through'
                }`}
              >
                {feature.included ? (
                  <CheckIcon className="mt-1 size-4 shrink-0 text-forest" />
                ) : (
                  <XIcon className="mt-1 size-4 shrink-0" />
                )}
                <span>
                  {feature.text}
                  {feature.note != null && (
                    <span className="block text-sm font-light text-cream-muted no-underline">
                      {feature.note}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-1 text-sm text-cream-muted">
            {footnotes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        </CardContent>
        <CardFooter className="justify-between border-ink/10 bg-forest/8">
          <span className="text-lg font-medium text-ink">
            {formatMoney(pkg.basePriceInCents)}
          </span>
          <span className="text-sm text-cream-dim">
            + {formatMoney(pkg.studioPriceInCents)} stúdiódíj
          </span>
        </CardFooter>
      </Card>
    </ResponsiveDialog>
  );
}
