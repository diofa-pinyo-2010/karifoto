import { Client } from '@upstash/qstash';
import { Redis } from '@upstash/redis';

import { env } from '@/env';

export const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

export const qStashClient = new Client({
  token: env.QSTASH_TOKEN,
  devMode: env.QSTASH_DEV,
});
