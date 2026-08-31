import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import { env } from '@/env';
import { PrismaClient } from '@/generated/prisma/client';

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  options: '-c TimeZone=UTC',
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DAYS_AHEAD = 6;
const START_HOUR = 10;
const END_HOUR = 18;

function getBudapestDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Budapest',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  return { year, month, day };
}

function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
) {
  const naiveUtc = Date.UTC(year, month - 1, day, hour);
  const asUtcDate = new Date(naiveUtc);
  const tzTime = new Date(
    asUtcDate.toLocaleString('en-US', { timeZone: 'Europe/Budapest' }),
  ).getTime();
  const utcTime = new Date(
    asUtcDate.toLocaleString('en-US', { timeZone: 'UTC' }),
  ).getTime();
  return new Date(naiveUtc + (utcTime - tzTime));
}

function buildUpcomingTimeSlots() {
  const today = getBudapestDateParts(new Date());
  const slots: { startTime: Date; endTime: Date }[] = [];

  for (let dayOffset = 1; dayOffset <= DAYS_AHEAD; dayOffset++) {
    for (let hour = START_HOUR; hour < END_HOUR; hour++) {
      slots.push({
        startTime: zonedTimeToUtc(
          today.year,
          today.month,
          today.day + dayOffset,
          hour,
        ),
        endTime: zonedTimeToUtc(
          today.year,
          today.month,
          today.day + dayOffset,
          hour + 1,
        ),
      });
    }
  }

  return slots;
}

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'nemethricsi@gmail.com' },
    update: {},
    create: {
      email: 'nemethricsi@gmail.com',
      firstName: 'Ricsi',
      lastName: 'Németh',
      phoneNumber: '+36 20 936 9932',
    },
  });

  await prisma.staffProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      role: 'SUPERADMIN',
    },
  });

  await prisma.timeSlot.createMany({
    data: buildUpcomingTimeSlots(),
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
