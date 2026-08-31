import { createEnv } from '@t3-oss/env-core';
import * as z from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    DIRECT_URL: z.url(),
    RESEND_API_KEY: z.string().min(1),
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    SZAMLAZZ_API_KEY: z.string().min(1),
    COMING_SOON_ENABLED: z.stringbool().default(false),
    COMING_SOON_PREVIEW_TOKEN: z.string().min(16).optional(),
  },
  clientPrefix: 'NEXT_PUBLIC_',
  client: {
    NEXT_PUBLIC_SITE_URL: z.string().min(1),
    NEXT_PUBLIC_VERCEL_ENV: z
      .enum(['development', 'preview', 'production'])
      .optional(),
    NEXT_PUBLIC_CLARITY_ID: z.string().min(1).optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    SZAMLAZZ_API_KEY: process.env.SZAMLAZZ_API_KEY,
    COMING_SOON_ENABLED: process.env.COMING_SOON_ENABLED,
    COMING_SOON_PREVIEW_TOKEN: process.env.COMING_SOON_PREVIEW_TOKEN,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
    NEXT_PUBLIC_CLARITY_ID: process.env.NEXT_PUBLIC_CLARITY_ID,
  },
  emptyStringAsUndefined: true,
});
