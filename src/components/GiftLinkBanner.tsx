import { CopyButton } from '@/components/admin/CopyButton';

// A még be nem váltott ajándék linkje a vásárló portálján. Szándékosan nem
// kattintható: továbbadásra való, nem a vásárlónak kell megnyitnia.
export function GiftLinkBanner({ url }: { url: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-white p-4">
      <p className="m-0 font-medium">🎁 Ajándék</p>
      <p className="m-0 text-brand-muted">
        Ezt a fotózást ajándékba vettétek. Az alábbi linket akkor adjátok át az
        ajándékozottnak, amikor csak szeretnétek: ő megadja a saját adatait, és
        innentől minden értesítést ő kap meg. Ha inkább ti jöttök el, nincs más
        teendőtök.
      </p>
      <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
        <span className="min-w-0 flex-1 font-mono text-sm break-all select-all">
          {url}
        </span>
        <CopyButton value={url} />
      </div>
    </div>
  );
}
