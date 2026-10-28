import { formatDistanceToNow } from 'date-fns';
import { hu } from 'date-fns/locale';

import { RefreshTerminalsButton } from '@/components/RefreshTerminalsButton';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { APP_URLS } from '@/lib/constants';
import { requireNavAccess } from '@/lib/dal';
import { timeWithSecondsFormatter } from '@/lib/formatters';
import { listReadersWithStatus } from '@/lib/sumup/client';
import {
  getReaderBadge,
  readerConnectionLabel,
  readerStateLabel,
} from '@/lib/sumup/readers';
import { cn } from '@/lib/utils';

import type { ReaderBadge } from '@/lib/sumup/readers';

const BADGE_TONE_CLASS: Record<ReaderBadge['tone'], string> = {
  online: 'bg-green-600 text-white dark:bg-green-500',
  offline: 'bg-destructive text-white',
  unavailable: 'bg-muted text-muted-foreground',
};

export default async function TerminalsAdminPage() {
  await requireNavAccess(APP_URLS.terminals);

  let readers: Awaited<ReturnType<typeof listReadersWithStatus>> | null = null;
  try {
    readers = await listReadersWithStatus();
  } catch (error) {
    console.error('SumUp readers list failed', error);
  }
  const fetchedAt = new Date();

  return (
    <div className="mx-auto flex w-full flex-col gap-6 lg:w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-muted-foreground lg:text-2xl">
            Terminálok
          </h1>
          <p className="text-xs text-muted-foreground">
            Frissítve: {timeWithSecondsFormatter.format(fetchedAt)}
          </p>
        </div>
        <RefreshTerminalsButton />
      </div>

      {readers === null && (
        <p className="text-destructive">
          Nem sikerült lekérni a terminálokat a SumUptól. Próbáld újra a
          Frissítés gombbal.
        </p>
      )}

      {readers?.length === 0 && (
        <p className="text-muted-foreground">Nincs csatlakoztatott terminál.</p>
      )}

      {readers && readers.length > 0 && (
        <div className="flex flex-col gap-4">
          {readers.map(({ reader, deviceStatus, isPaymentReader }) => {
            const badge = getReaderBadge(reader.status, deviceStatus);
            const details = [
              deviceStatus?.battery_level != null &&
                `Akku: ${Math.round(deviceStatus.battery_level)}%`,
              deviceStatus?.connection_type &&
                readerConnectionLabel(deviceStatus.connection_type),
              deviceStatus?.firmware_version &&
                `fw ${deviceStatus.firmware_version}`,
            ].filter(Boolean);
            const lastActivity = deviceStatus?.last_activity
              ? new Date(deviceStatus.last_activity)
              : null;

            return (
              <Card key={reader.id}>
                <CardHeader>
                  <CardTitle>{reader.name}</CardTitle>
                  <CardDescription>
                    {[
                      isPaymentReader && 'Fizetésre használt',
                      deviceStatus?.status === 'ONLINE' &&
                        deviceStatus.state &&
                        readerStateLabel(deviceStatus.state),
                    ]
                      .filter(Boolean)
                      .join(' · ') || reader.device.identifier}
                  </CardDescription>
                  <CardAction>
                    <Badge
                      className={cn(
                        'h-6 px-3 text-sm',
                        BADGE_TONE_CLASS[badge.tone],
                      )}
                    >
                      ● {badge.label}
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
                  {details.length > 0 && <p>{details.join(' · ')}</p>}
                  {lastActivity && (
                    <p>
                      Utolsó aktivitás:{' '}
                      {formatDistanceToNow(lastActivity, {
                        addSuffix: true,
                        locale: hu,
                      })}
                    </p>
                  )}
                  <p>
                    Reader ID:{' '}
                    <span className="font-mono text-xs select-all">
                      {reader.id}
                    </span>
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
