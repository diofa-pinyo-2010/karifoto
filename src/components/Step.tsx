export function Step({
  n,
  label,
  className = '',
}: {
  n: number;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`text-[11px] tracking-chip text-[#7B8C80] uppercase ${className}`}
    >
      {n} · {label}
    </div>
  );
}
