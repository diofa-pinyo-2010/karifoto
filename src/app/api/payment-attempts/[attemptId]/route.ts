import type { NextRequest } from 'next/server';

import * as z from 'zod';

import { getSession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';

// A fizetési dialog ezt pollozza. Csak olvas: az állapotot a SumUp webhook írja.
//
// getSession() és nem verifySession(): az utóbbi redirectel a login oldalra,
// a fetch-es hívó pedig JSON státuszkódot vár.
export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/payment-attempts/[attemptId]'>,
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Az id @db.Uuid: nem UUID érték Prisma hibát (500) dobna 404 helyett.
  const attemptId = z.uuid().safeParse((await ctx.params).attemptId);
  if (!attemptId.success) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const attempt = await prisma.sumupCheckoutAttempt.findUnique({
    where: { id: attemptId.data },
  });
  if (!attempt) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  return Response.json(attempt, { headers: { 'Cache-Control': 'no-store' } });
}
