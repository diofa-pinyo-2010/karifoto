import { STUDIO_TZ } from '@/lib/constants';
import { EVENT_TTL } from '@/lib/idempotency';
import { redis } from '@/lib/upstash';

const date = new Date();

const hungarianFormatter = new Intl.DateTimeFormat('hu-HU', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: STUDIO_TZ,
});

const weekday = new Intl.DateTimeFormat('hu-HU', {
  weekday: 'long',
}).format(date);

const time = new Intl.DateTimeFormat('hu-HU', {
  hour: '2-digit',
  minute: '2-digit',
}).format(date);

export async function GET() {
  try {
    await redis.setex(
      `jo-reggelt-kivanok: ${weekday}, ${time}`,
      EVENT_TTL,
      hungarianFormatter.format(date),
    );

    return Response.json({ ok: true });
  } catch {
    return new Response('Error', { status: 500 });
  }
}
