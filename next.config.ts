import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    agentUpgrade: 'security',
  },
  images: {
    // Next 16-tól csak az itt felsorolt `quality` értékek engedettek.
    // 65: a hero, ahol a webp-tömörítés látható veszteség nélkül bírja.
    qualities: [65, 75],
  },
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
