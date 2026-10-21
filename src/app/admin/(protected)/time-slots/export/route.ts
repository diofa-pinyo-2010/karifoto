import { StaffProfileRole } from '@/generated/prisma/enums';
import { buildBookingsCsv } from '@/lib/bookings-csv';
import { verifySession } from '@/lib/dal';
import { formatFileNameDateTime } from '@/lib/formatters';
import { prisma } from '@/lib/prisma';
import { calculatePricing } from '@/server/pricing';

export async function GET() {
  const { staffProfile } = await verifySession();
  if (staffProfile.role !== StaffProfileRole.SUPERADMIN) {
    return new Response('Nincs jogosultságod ehhez a művelethez.', {
      status: 403,
    });
  }

  const shootings = await prisma.photoShooting.findMany({
    include: {
      timeSlot: { select: { startTime: true } },
      client: {
        select: { owner: { select: { email: true, phoneNumber: true } } },
      },
      pricing: true,
      adjustments: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const csv = buildBookingsCsv(
    shootings.map((shooting) => ({
      createdAt: shooting.createdAt,
      startTime: shooting.timeSlot.startTime,
      email: shooting.client.owner.email,
      phoneNumber: shooting.client.owner.phoneNumber,
      // Ugyanaz az érték, mint a `booking_completed` eventben; a
      // totalToBeInvoiced nem függ a befizetésektől, ezért nincs ledger.
      amountInCents: shooting.pricing
        ? calculatePricing({
            pricing: shooting.pricing,
            shooting,
            adjustments: shooting.adjustments,
            ledgerEntries: [],
          }).totalToBeInvoiced
        : null,
      photoShootingId: shooting.id,
      status: shooting.status,
    })),
  );

  const fileName = `foglalasok-${formatFileNameDateTime(new Date())}.csv`;

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}
