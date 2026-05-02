import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Portless worktrees use `<branch>.app.nexus-ai.localhost`; wildcard keeps HMR/devtools allowed.
  allowedDevOrigins: ['app.nexus-ai.localhost', '*.app.nexus-ai.localhost'],
  turbopack: {
    root: path.resolve(__dirname, '../'),
  },
  experimental: {
    // https://nextjs.org/docs/app/api-reference/functions/unauthorized
    authInterrupts: true,
  },
};

export default nextConfig;
