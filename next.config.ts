import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Régi WordPress-oldalak átirányítása → új főoldal
      { source: '/karacsonyi-fotozas-2025', destination: '/', permanent: true },
      { source: '/idopont-foglalo-urlap', destination: '/', permanent: true },
      { source: '/idopont-foglalo-urlap-2', destination: '/', permanent: true },
      { source: '/idopont-kereso-urlap', destination: '/', permanent: true },
      { source: '/dijbekero-oldal', destination: '/', permanent: true },
      { source: '/dijbekero-oldal-2', destination: '/', permanent: true },
    ];
  },
};

export default nextConfig;
