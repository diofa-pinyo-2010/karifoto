/** „KARI” nyomtatott + „foto” írott lockup. `size` = a nyomtatott rész px-mérete. */
export function Wordmark({
  size = 24,
  className = '',
  scriptClassName = 'text-gold',
}: {
  size?: number;
  className?: string;
  scriptClassName?: string;
}) {
  return (
    <span className={`flex items-baseline ${className}`}>
      <span
        className="font-display leading-none font-medium tracking-[.12em] uppercase"
        style={{ fontSize: size }}
      >
        Kari
      </span>
      <span
        className={`ml-0.75 font-script leading-none ${scriptClassName}`}
        style={{ fontSize: Math.round(size * 1.16) }}
      >
        foto
      </span>
    </span>
  );
}
