import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-auth, @ember/shared, and related packages have circular ESM dependencies that cause
  // "Cannot access before initialization" errors when bundled by Turbopack.
  serverExternalPackages: [
    '@ember/shared',
    '@prisma/client',
    '@prisma/adapter-pg',
    'better-auth',
    '@better-auth/core',
    '@better-auth/utils',
    '@better-auth/prisma-adapter',
    'pg',
    'siwe',
    '@spruceid/siwe-parser',
    'ethers',
  ],
  // Disable CORS for API routes — browser requests only (per SPEC §15.2)
  headers() {
    return Promise.resolve([
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.NEXT_PUBLIC_APP_URL ?? '' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ])
  },
};

export default nextConfig;
