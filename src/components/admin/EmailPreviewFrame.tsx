'use client';

import { useState } from 'react';

import { MonitorIcon, SmartphoneIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const VIEWPORTS = {
  desktop: { label: 'Asztali', width: 'w-full', icon: MonitorIcon },
  mobile: { label: 'Mobil', width: 'w-[375px]', icon: SmartphoneIcon },
} as const;

type Viewport = keyof typeof VIEWPORTS;

export function EmailPreviewFrame({ html }: { html: string }) {
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [height, setHeight] = useState(600);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {(Object.keys(VIEWPORTS) as Viewport[]).map((key) => {
          const { label, icon: Icon } = VIEWPORTS[key];
          return (
            <Button
              key={key}
              variant={viewport === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewport(key)}
            >
              <Icon />
              {label}
            </Button>
          );
        })}
      </div>
      {/* sandbox without allow-scripts: the email can't run code, but
          allow-same-origin lets us read its height to avoid a scrollbar. */}
      <iframe
        title="E-mail előnézet"
        srcDoc={html}
        sandbox="allow-same-origin"
        style={{ height }}
        className={cn(
          'mx-auto max-w-full rounded-lg border bg-white transition-[width]',
          VIEWPORTS[viewport].width,
        )}
        onLoad={(event) => {
          const document = event.currentTarget.contentDocument;
          if (document) {
            setHeight(document.documentElement.scrollHeight);
          }
        }}
      />
    </div>
  );
}
