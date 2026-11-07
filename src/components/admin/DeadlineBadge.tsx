import { Badge } from '@/components/ui/badge';
import { shortDateFormatter } from '@/lib/formatters';
import { getDeliveryDeadline } from '@/lib/utils';

export function DeadlineBadge({
  isExpressPostProduction,
  selectionCompletedAt,
}: {
  isExpressPostProduction: boolean;
  selectionCompletedAt: Date | null;
}) {
  if (selectionCompletedAt == null) return null;

  const deadline = shortDateFormatter.format(
    getDeliveryDeadline(selectionCompletedAt, isExpressPostProduction),
  );

  return isExpressPostProduction ? (
    <Badge variant="destructive">⚡ Expressz · {deadline}</Badge>
  ) : (
    <Badge variant="outline">Határidő · {deadline}</Badge>
  );
}
