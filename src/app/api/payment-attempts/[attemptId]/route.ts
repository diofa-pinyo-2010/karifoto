import type { NextRequest } from 'next/server';

import * as z from 'zod';

import { getSession } from '@/lib/dal';
import { prisma } from '@/lib/prisma';
import { getTransactionForAttempt } from '@/lib/sumup/client';
import {
  canForceCloseAttempt,
  shouldReconcileAttempt,
} from '@/lib/sumup/reconcile';
import { reconcileSumUpAttempt } from '@/server/reconcile-sumup-attempt';

import type { SumupCheckoutAttempt } from '@/generated/prisma/client';

// A fizetési dialog ezt pollozza. Az állapotot alapból a SumUp webhook írja; ha
// az késik, egy idő után mi kérdezünk rá a SumUp API-ra (lásd `reconcile.ts`).
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

  let attempt = await prisma.sumupCheckoutAttempt.findUnique({
    where: { id: attemptId.data },
  });
  if (!attempt) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  if (shouldReconcileAttempt(attempt, new Date())) {
    attempt = await reconcileStaleAttempt(attempt);
  }

  return Response.json(
    { ...attempt, canForceClose: canForceCloseAttempt(attempt, new Date()) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

async function reconcileStaleAttempt(attempt: SumupCheckoutAttempt) {
  // Az `updatedAt` a fojtás: aki elsőként átírja, az kérdez, a párhuzamos
  // pollok (több tab) addig nem.
  const { count } = await prisma.sumupCheckoutAttempt.updateMany({
    where: { id: attempt.id, updatedAt: attempt.updatedAt },
    data: { updatedAt: new Date() },
  });
  if (count === 0) {
    return attempt;
  }

  // A poll nem bukhat el a SumUp miatt: a következő körben újra próbáljuk.
  try {
    const transaction = await getTransactionForAttempt(attempt.id);
    if (transaction != null) {
      await reconcileSumUpAttempt(attempt.id, transaction);
    }
  } catch (error) {
    console.error('[payment-attempts] reconcile failed', {
      attemptId: attempt.id,
      error,
    });
  }

  return prisma.sumupCheckoutAttempt.findUniqueOrThrow({
    where: { id: attempt.id },
  });
}
