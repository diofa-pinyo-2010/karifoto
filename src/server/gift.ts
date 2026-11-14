'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import * as z from 'zod';

import { env } from '@/env';
import { SessionKind } from '@/generated/prisma/client';
import { createClientPortalToken, createSession } from '@/lib/auth';
import { clientPortalLoginUrl } from '@/lib/client-portal';
import { APP_URLS } from '@/lib/constants';
import { sendDiscordNotification } from '@/lib/discord';
import { formatLongDate } from '@/lib/formatters';
import {
  GIFT_TRANSFERABLE_STATUSES,
  normalizeEmail,
  normalizeGiftCode,
  planGiftRedemption,
} from '@/lib/gift';
import { prisma } from '@/lib/prisma';
import { getGiftShootingByCode } from '@/lib/queries';
import {
  sendGiftReceivedEmail,
  sendGiftRedeemedEmail,
} from '@/lib/resend/gift';
import {
  CLIENT_SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from '@/lib/session';
import { stripe } from '@/lib/stripe';
import { qStashClient } from '@/lib/upstash';
import {
  generateClientShootingCalendarLink,
  getShootingEndTime,
} from '@/lib/utils';

export type GiftRedeemState =
  | { error?: string; checkInbox?: boolean }
  | undefined;

const NOT_REDEEMABLE_ERROR = 'Ez az ajándék már nem váltható be.';
const GENERIC_ERROR = 'Nem sikerült beváltani az ajándékot. Próbáld újra.';

const RedeemSchema = z.object({
  name: z.string().trim().min(2, 'Add meg a teljes neved.').max(100),
  email: z.email('Adj meg egy érvényes e-mail címet.'),
  phone: z.string().trim().min(6, 'Add meg a telefonszámod.').max(30),
  optOut: z.boolean(),
});

/**
 * Public and session-less: anyone holding the gift link can call it, so every
 * check the page made is repeated here, and the transfer itself is a
 * compare-and-swap on `giftCode` so two concurrent submits cannot both win.
 */
export async function redeemGift(
  giftCode: string,
  _prevState: GiftRedeemState,
  formData: FormData,
): Promise<GiftRedeemState> {
  const parsed = RedeemSchema.safeParse({
    name: formData.get('name') ?? '',
    email: normalizeEmail(String(formData.get('email') ?? '')),
    phone: formData.get('phone') ?? '',
    optOut: formData.get('optOut') === 'on',
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? GENERIC_ERROR };
  }

  const { name, email, phone, optOut } = parsed.data;

  const code = normalizeGiftCode(giftCode);
  const shooting = code ? await getGiftShootingByCode(code) : null;

  if (code == null || shooting == null) {
    return { error: NOT_REDEEMABLE_ERROR };
  }

  // Stored emails come from Stripe and are not guaranteed lowercase, so the
  // lookup is case-insensitive: a differently-cased address must still count as
  // an existing user, or it would get a fresh account and a session.
  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    include: { clientProfile: true },
  });

  const plan = planGiftRedemption({
    submittedEmail: email,
    currentClientEmail: shooting.client.owner.email,
    existingUser: existingUser != null,
  });

  if (!plan.ok) {
    return { error: plan.error };
  }

  // The recipient's identity. For an existing user nothing on User (name,
  // phone) or an existing ClientProfile (consent) is touched — whoever typed
  // the address may not be its owner.
  let recipient: {
    userId: string;
    clientProfileId: string;
    email: string;
    name: string;
  };

  try {
    if (existingUser != null) {
      const clientProfile =
        existingUser.clientProfile ??
        (await prisma.clientProfile.upsert({
          where: { userId: existingUser.id },
          // A profile created concurrently wins; ours only leaves an unused
          // Stripe customer behind.
          update: {},
          create: {
            userId: existingUser.id,
            stripeCustomerId: (
              await stripe.customers.create({
                name: existingUser.name,
                email: existingUser.email,
              })
            ).id,
          },
        }));

      recipient = {
        userId: existingUser.id,
        clientProfileId: clientProfile.id,
        email: existingUser.email,
        name: existingUser.name,
      };
    } else {
      // Stripe first: a DB failure afterwards leaves a harmless empty customer,
      // the reverse would leave a profile with no customer.
      const stripeCustomer = await stripe.customers.create({ name, email });

      const user = await prisma.user.create({
        data: {
          email,
          name,
          phoneNumber: phone,
          clientProfile: {
            create: {
              stripeCustomerId: stripeCustomer.id,
              marketingConsentAt: optOut ? null : new Date(),
            },
          },
        },
        include: { clientProfile: true },
      });

      recipient = {
        userId: user.id,
        clientProfileId: user.clientProfile!.id,
        email: user.email,
        name: user.name,
      };
    }
  } catch (error) {
    // Includes a P2002 when the same new email is submitted twice at once —
    // the retry takes the existing-user path.
    console.error('[gift] could not set up recipient', { code, error });
    return { error: GENERIC_ERROR };
  }

  // Compare-and-swap: only the submit that still sees this code (and the same
  // owner, in a transferable status) moves the shooting.
  const { count } = await prisma.photoShooting.updateMany({
    where: {
      id: shooting.id,
      giftCode: code,
      clientId: shooting.clientId,
      status: { in: [...GIFT_TRANSFERABLE_STATUSES] },
    },
    data: {
      clientId: recipient.clientProfileId,
      purchasedById: shooting.purchasedById ?? shooting.clientId,
      giftCode: null,
    },
  });

  if (count !== 1) {
    return { error: NOT_REDEEMABLE_ERROR };
  }

  console.log('[gift] redeemed', {
    shootingId: shooting.id,
    from: shooting.clientId,
    to: recipient.clientProfileId,
  });

  await notifyAfterRedemption({
    shooting,
    recipient,
    submittedName: name,
    publishMarketingContact: existingUser == null && !optOut,
  });

  if (!plan.logIn) {
    return { checkInbox: true };
  }

  const { raw, expiresAt } = await createSession(
    recipient.userId,
    SessionKind.CLIENT,
  );
  (await cookies()).set(
    CLIENT_SESSION_COOKIE_NAME,
    raw,
    sessionCookieOptions(expiresAt),
  );

  redirect(
    APP_URLS.clientPortalShootingDetails(
      recipient.clientProfileId,
      shooting.id,
    ),
  );
}

type GiftShooting = NonNullable<
  Awaited<ReturnType<typeof getGiftShootingByCode>>
>;

// Runs after the transfer has committed, so nothing here may undo it or fail
// the action: every failure is logged and reported on Discord.
async function notifyAfterRedemption({
  shooting,
  recipient,
  submittedName,
  publishMarketingContact,
}: {
  shooting: GiftShooting;
  recipient: {
    userId: string;
    clientProfileId: string;
    email: string;
    name: string;
  };
  submittedName: string;
  publishMarketingContact: boolean;
}) {
  const buyer = shooting.client.owner;
  const startTime = shooting.timeSlot.startTime;
  const bookedTimeString = formatLongDate(startTime);

  const results = await Promise.allSettled([
    (async () => {
      const { raw } = await createClientPortalToken(recipient.userId);
      const { error } = await sendGiftReceivedEmail({
        to: recipient.email,
        name: recipient.name,
        buyerName: buyer.name,
        bookedTimeString,
        addToGoogleCalendarLink: generateClientShootingCalendarLink(
          startTime,
          getShootingEndTime(
            startTime,
            shooting.package,
            shooting.isLightPlaySelected,
          ),
        ),
        clientPortalLoginLink: clientPortalLoginUrl({
          clientProfileId: recipient.clientProfileId,
          shootingId: shooting.id,
          rawToken: raw,
        }),
        shootingId: shooting.id,
        clientId: recipient.clientProfileId,
      });
      if (error != null) throw new Error(`Resend: ${error.message}`);
    })(),
    (async () => {
      // The submitted name, not the stored one: an existing account's name
      // is not ours to show the buyer.
      const { error } = await sendGiftRedeemedEmail({
        to: buyer.email,
        name: buyer.name,
        recipientName: submittedName,
        bookedTimeString,
        shootingId: shooting.id,
        clientId: shooting.clientId,
      });
      if (error != null) throw new Error(`Resend: ${error.message}`);
    })(),
    publishMarketingContact
      ? qStashClient.publishJSON({
          url: `${env.NEXT_PUBLIC_SITE_URL}/api/jobs/create-resend-contact`,
          body: { email: recipient.email },
          retries: 3,
        })
      : null,
  ]);

  const labels = [
    'ajándék megérkezett email (megajándékozott)',
    'ajándék beváltva email (vásárló)',
    'Resend kontakt job',
  ];

  for (const [index, result] of results.entries()) {
    if (result.status === 'fulfilled') continue;

    console.error('[gift] post-redemption step failed', {
      step: labels[index],
      shootingId: shooting.id,
      error: result.reason,
    });
    await sendDiscordNotification({
      type: 'warning',
      content: [
        '**Ajándék beváltva, de egy utólagos lépés nem sikerült**\n',
        `Lépés: ${labels[index]}`,
        `Fotózás ID: ${shooting.id}`,
        `Új ügyfél (ClientProfile ID): ${recipient.clientProfileId}`,
      ].join('\n'),
    });
  }
}
