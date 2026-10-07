'use client';

import { useState } from 'react';

import { CheckIcon, CircleQuestionMarkIcon, XIcon } from 'lucide-react';

import { ResponsiveDialog } from '@/components/ResponsiveDialog';
import { Button } from '@/components/ui/button';
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
      title={`${pkg.label} csomag`}
      description={buildSub(pkg)}
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
      <p className="mb-4 text-base text-ink">
        <span className="font-medium">{formatMoney(pkg.basePriceInCents)}</span>{' '}
        <span className="text-cream-dim">
          + {formatMoney(pkg.studioPriceInCents)} stúdiódíj
        </span>
      </p>
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
      <div className="mt-4 flex flex-col gap-1 text-sm text-cream-muted">
        {footnotes.map((note) => (
          <p key={note}>{note}</p>
        ))}
      </div>
    </ResponsiveDialog>
  );
}
