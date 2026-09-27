import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import * as z from 'zod';

import { env } from '@/env';
import { resend } from '@/lib/resend';

export const POST = verifySignatureAppRouter(
  async (req: Request) => {
    const parsed = z.object({ email: z.email() }).safeParse(await req.json());

    if (!parsed.success) {
      return new Response('invalid payload', {
        status: 489,
        headers: { 'Upstash-NonRetryable-Error': 'true' },
      });
    }

    const { data: existingContact, error: getError } =
      await resend.contacts.get({
        email: parsed.data.email,
      });
    if (getError && getError.name !== 'not_found') {
      return new Response(getError.message, { status: 500 });
    }

    // Existing contacts are left as is
    // nothing to update while we only have the email.
    // (Later if we have other fields eg. name, we could update)
    if (!existingContact) {
      const { error: createError } = await resend.contacts.create({
        email: parsed.data.email,
        properties: {
          first_shooting_booked_at: new Date().toDateString(),
        },
      });

      if (createError) {
        // let QStash retry
        return new Response(createError.message, { status: 500 });
      }
    }

    return new Response(`Contact is on Resend: ${parsed.data.email}`, {
      status: 200,
    });
  },
  { devMode: env.QSTASH_DEV },
);
