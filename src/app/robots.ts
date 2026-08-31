import type { MetadataRoute } from 'next';

import { env } from '@/env';

export default function robots(): MetadataRoute.Robots {
  if (env.COMING_SOON_ENABLED) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return { rules: { userAgent: '*', allow: '/' } };
}
