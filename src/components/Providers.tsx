'use client';

import type { ReactNode } from 'react';

import { ProgressProvider } from '@bprogress/next/app';

import { TooltipProvider } from '@/components/ui/tooltip';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ProgressProvider
      height="4px"
      color="#e5b77e"
      options={{ showSpinner: false }}
      shallowRouting
    >
      <TooltipProvider>{children}</TooltipProvider>
    </ProgressProvider>
  );
}
