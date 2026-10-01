import { cn } from '@/lib/utils';

export function DetailRow({
  label,
  value,
  fullWidth = false,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
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
