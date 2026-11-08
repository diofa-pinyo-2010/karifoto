'use client';

import { useState } from 'react';

import { CheckIcon, CopyIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error('[copy-button] clipboard write failed', error);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={copy}
      aria-label={copied ? 'Másolva' : 'Másolás'}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </Button>
  );
}
