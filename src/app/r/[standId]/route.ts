import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import * as z from 'zod';

import { TapChannel } from '@/generated/prisma/enums';
import { GOOGLE_REVIEW_URL } from '@/lib/constants';
import { prisma } from '@/lib/prisma';

// The link printed on a review stand's NFC tag and QR code (`?channel=nfc` /
// `?channel=qr` says which). Logs the tap, then sends the client on to Google.
//
// Logging is best effort: whatever goes wrong here, the client still has to end
// up on the review page. The write is awaited because the function may be frozen
// as soon as the response is sent.
export async function GET(req: NextRequest, ctx: RouteContext<'/r/[standId]'>) {
  try {
    // The id is @db.Uuid: a non-UUID value would make Prisma throw.
    const standId = z.uuid().safeParse((await ctx.params).standId);
    const stand = standId.success
      ? await prisma.reviewStand.findUnique({
          where: { id: standId.data },
          select: { id: true, staffProfileId: true, active: true },
        })
      : null;

    if (stand) {
      await prisma.reviewTap.create({
        data: {
          standId: stand.id,
          // A retired stand's taps are kept, but they earn nobody a bonus.
          staffProfileId: stand.active ? stand.staffProfileId : null,
          channel: parseChannel(req.nextUrl.searchParams.get('channel')),
        },
      });
    }
  } catch (error) {
    console.error('[review-tap] logging failed', error);
  }

  return NextResponse.redirect(GOOGLE_REVIEW_URL, 302);
}

function parseChannel(channel: string | null) {
  if (channel === 'nfc') return TapChannel.NFC;
  if (channel === 'qr') return TapChannel.QR;
  return null;
}
