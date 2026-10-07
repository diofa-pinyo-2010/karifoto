import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ngrok tunnel for SumUp webhook/redirect testing — without this the dev
  // server blocks its JS/HMR assets and the page never hydrates.
  allowedDevOrigins: ['adjusted-native-macaque.ngrok-free.app'],
};

export default nextConfig;
