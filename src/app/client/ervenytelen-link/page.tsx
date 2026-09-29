// Where the verify route sends a token it can't accept. A static segment, so
// Next matches it ahead of the sibling [clientProfileId] route — and a real
// clientProfileId is always a UUID, so the two can never collide.
export default function ClientPortalInvalidLinkPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-display text-3xl">Ez a link nem működik</h1>
      <p className="mt-4 text-sm text-neutral-600">
        Lehet, hogy lejárt, vagy nem teljesen másolódott be a böngészőbe.
        Próbáljátok meg újra a visszaigazoló emailben lévő „Ügyfélportál”
        gombbal, vagy írjatok nekünk.
      </p>
    </div>
  );
}
