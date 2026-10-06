import type { MetadataRoute } from 'next';

import { env } from '@/env';

const PUBLIC_PATHS = ['/', '/aszf', '/adatkezeles', '/impresszum'];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((path) => ({
    url: `${env.NEXT_PUBLIC_SITE_URL}${path === '/' ? '' : path}`,
  }));
}
