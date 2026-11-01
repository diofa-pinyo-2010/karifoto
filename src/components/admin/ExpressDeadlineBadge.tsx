import { Badge } from '@/components/ui/badge';
import { shortDateFormatter } from '@/lib/formatters';
import { getExpressDeliveryDeadline } from '@/lib/utils';

/** Csak akkor jelenik meg, ha az ügyfél kért expressz utómunkát. */
export function ExpressDeadlineBadge({
  isExpressPostProduction,
  selectionCompletedAt,
}: {
  isExpressPostProduction: boolean;
  selectionCompletedAt: Date | null;
}) {
  if (!isExpressPostProduction || selectionCompletedAt == null) return null;

  return (
    <Badge variant="destructive">
      ⚡ Expressz ·{' '}
      {shortDateFormatter.format(
        getExpressDeliveryDeadline(selectionCompletedAt),
      )}
    </Badge>
  );
}
