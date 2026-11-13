'use client';

import Image, { type StaticImageData } from 'next/image';
import { useState } from 'react';

import { CircleQuestionMarkIcon } from 'lucide-react';

import { ResponsiveDialog } from '@/components/ResponsiveDialog';
import { Button } from '@/components/ui/button';

export function ImageInfoDialog({
  title,
  description,
  image,
  triggerLabel,
}: {
  title: string;
  description: string;
  image: StaticImageData & { alt: string };
  triggerLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={setOpen}
      showCloseButton
      title={title}
      description={description}
      trigger={
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={triggerLabel}
          // A gomb egy választó-kártya <label>-jében van: ne jelölje ki az opciót.
          onClick={(event) => event.stopPropagation()}
        >
          <CircleQuestionMarkIcon />
        </Button>
      }
    >
      <Image
        src={image}
        alt={image.alt}
        placeholder="blur"
        sizes="(min-width: 768px) 28rem, 100vw"
        className="w-full rounded-lg ring-1 ring-ink/10"
      />
    </ResponsiveDialog>
  );
}
