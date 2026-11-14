'use client';

import { useState, useTransition } from 'react';

import { CheckIcon } from 'lucide-react';

import { badgeVariants } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/toast';
import { useMediaQuery } from '@/hooks/use-media-query';
import { buildPhotographerOptions } from '@/lib/photographer-options';
import { cn } from '@/lib/utils';
import { updatePhotoShootingField } from '@/server/admin';

export function PhotographerBadgeSelect({
  shootingId,
  photographerId,
  photographerNickname,
  photographers,
  badgeClassName,
  disabled = false,
}: {
  shootingId: string;
  photographerId: string | null;
  photographerNickname: string | null;
  photographers: { id: string; nickname: string }[];
  badgeClassName?: string;
  disabled?: boolean;
}) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const options = buildPhotographerOptions(photographers, photographerId);
  const currentLabel = photographerNickname ?? '???';

  function select(id: string | null) {
    setOpen(false);
    if (id === photographerId) return;

    startTransition(async () => {
      const res = await updatePhotoShootingField(
        shootingId,
        'photographerId',
        id,
      );
      // Sikeres mentésnél az action revalidatePath-ja miatt a jelenlegi
      // oldal friss RSC payloadja ugyanabban a válaszban érkezik.
      if (res && 'error' in res) {
        toast.add({ title: res.error, type: 'error' });
      }
    });
  }

  // A kártya egésze egy kifeszített link (lásd PhotoShootingListItem), ezért
  // a gombnak a link rétege fölé kell kerülnie (relative z-10).
  const triggerClassName = cn(
    badgeVariants({ variant: 'secondary' }),
    'relative z-10 cursor-pointer hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50',
    badgeClassName,
  );
  const isDisabled = disabled || isPending;

  if (isDesktop) {
    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          className={triggerClassName}
          disabled={isDisabled}
          aria-label="Fotós kiválasztása"
        >
          {currentLabel}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-auto">
          {options.map((option) => (
            <DropdownMenuItem
              key={option.id ?? 'none'}
              onClick={() => select(option.id)}
            >
              <CheckIcon className={cn(!option.isCurrent && 'invisible')} />
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
      <DrawerTrigger
        className={triggerClassName}
        disabled={isDisabled}
        aria-label="Fotós kiválasztása"
      >
        {currentLabel}
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Fotós kiválasztása</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-1 p-4 pt-0">
          {options.map((option) => (
            <Button
              key={option.id ?? 'none'}
              type="button"
              variant="ghost"
              size="lg"
              className="justify-start"
              onClick={() => select(option.id)}
            >
              <CheckIcon className={cn(!option.isCurrent && 'invisible')} />
              {option.label}
            </Button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
