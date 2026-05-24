import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Enable when needed
  },
  // Disable CORS for API routes — browser requests only (per SPEC §15.2)
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.NEXT_PUBLIC_APP_URL ?? '' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
};

export default nextConfig;
