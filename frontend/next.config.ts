import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, '../'),
  },
  experimental: {
    // https://nextjs.org/docs/app/api-reference/functions/unauthorized
    authInterrupts: true,
  },
};

export default nextConfig;
