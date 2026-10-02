import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface DetailRowProps {
  label: React.ReactNode;
  value: React.ReactNode;
  fullWidth?: boolean;
  htmlForId?: string;
}

export function DetailRow({
  label,
  value,
  fullWidth = false,
  htmlForId,
}: DetailRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0">
      {htmlForId ? (
        <Label
          htmlFor={htmlForId}
          className="shrink-0 text-sm font-normal text-muted-foreground"
        >
          {label}
        </Label>
      ) : (
        <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      )}
      <span
        className={cn(
          'text-right text-sm font-medium',
          fullWidth && 'min-w-0 flex-1',
        )}
      >
        {value}
      </span>
    </div>
  );
}
