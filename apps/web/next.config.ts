import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    // Enable when needed
  },
  // @aws-sdk/client-s3 is only used by the S3/MinIO storage driver (lazy require). Keep it
  // external so it's resolved at runtime instead of bundled into route handlers.
  serverExternalPackages: ['@aws-sdk/client-s3'],
  turbopack: {
    // wagmi's experimental tempo connector does `import('accounts')` for an optional
    // package that doesn't exist; stub it so the production build can resolve it.
    resolveAlias: {
      accounts: './lib/turbopack-empty-stub.ts',
    },
  },
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
