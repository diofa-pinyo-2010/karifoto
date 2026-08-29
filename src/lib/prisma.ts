import { PrismaPg } from '@prisma/adapter-pg';

import { env } from '@/env';
import { PrismaClient } from '@/generated/prisma/client';

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  options: '-c TimeZone=UTC',
});

export const prisma = new PrismaClient({ adapter });
