'use client';

import { RefreshCcwIcon } from 'lucide-react';

import { StartTimeDrawer } from '@/components/StartTimeDrawer';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { shortFullDateFormatter } from '@/lib/formatters';
import { changeTimeOfPhotoShooting } from '@/server/photo-shootings';

interface ChangeStartTimeButtonProps {
  currentStartTime: Date;
  shootingId: string;
}

export function ChangeStartTimeButton({
  currentStartTime,
  shootingId,
}: ChangeStartTimeButtonProps) {
  async function handleConfirm(newStartTime: Date) {
    const res = await changeTimeOfPhotoShooting({ shootingId, newStartTime });
    if (res && 'error' in res) return res;
    toast.add({
      title: 'Időpont módosítva',
      description: `Új időpont: ${shortFullDateFormatter.format(newStartTime)}. Az ügyfelet e-mailben értesítjük.`,
      type: 'success',
    });
  }

  return (
    <StartTimeDrawer
      value={currentStartTime}
      excludeShootingId={shootingId}
      requireChange
      confirmLabel="Mentés"
      confirmation={{
        description:
          'Megváltoztatjuk a fotózás időpontját, és erről egy email-t küldünk az ügyfélnek.',
      }}
      onConfirm={handleConfirm}
      trigger={
        <Button variant="destructive" className="uppercase" size="lg">
          <RefreshCcwIcon />
          Új időpont
        </Button>
      }
    />
  );
}
