'use client';

import type { ReactElement, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { useMediaQuery } from '@/hooks/use-media-query';

export function ResponsiveDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  showCloseButton = false,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactElement;
  title: string;
  description?: string;
  showCloseButton?: boolean;
  children: ReactNode;
}) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger render={trigger} />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description != null && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerTrigger render={trigger} />
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{title}</DrawerTitle>
          {description != null && (
            <DrawerDescription>{description}</DrawerDescription>
          )}
        </DrawerHeader>
        <div className="mt-4 p-4 pt-0">{children}</div>
        {showCloseButton && (
          <DrawerFooter>
            <DrawerClose
              render={<Button variant="brand" size="lg" className="w-full" />}
            >
              Bezárás
            </DrawerClose>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
