import 'server-only';
import { UUID_RE } from '@/lib/constants';
import { prisma } from '@/lib/prisma';
import { resolveBalancePayment } from '@/server/balance-payment-guard';

/**
 * Betölti a fotózást és eldönti, átvehető-e a hátralék és mennyi — a készpénzes
 * és a kártyás ág közös belépője, hogy a kettő ne térhessen el.
 */
export async function loadBalancePayment(
  shootingId: string,
): Promise<
  | { ok: true; amountInCents: number; clientName: string }
  | { ok: false; error: string }
> {
  if (!UUID_RE.test(shootingId)) {
    return { error: 'Érvénytelen PhotoShooting ID.', ok: false };
  }

  const shooting = await prisma.photoShooting.findUnique({
    where: { id: shootingId },
    include: {
      adjustments: true,
      ledgerEntries: true,
      pricing: true,
      client: { select: { owner: { select: { name: true } } } },
    },
  });

  if (shooting == null) {
    return { error: 'Nem találjuk ezt a fotózást.', ok: false };
  }

  const decision = resolveBalancePayment({
    adjustments: shooting.adjustments,
    ledgerEntries: shooting.ledgerEntries,
    pricing: shooting.pricing,
    shooting,
    status: shooting.status,
  });

  if (!decision.ok) {
    return decision;
  }

  return { ...decision, clientName: shooting.client.owner.name };
}
