import type { NextConfig } from 'next';

// In production the frontend and API must be same-origin so the refresh_token
// cookie is first-party on the Vercel domain (the proxy middleware reads it to
// gate routes). We proxy /api/* to the real API host server-side. Set
// API_PROXY_TARGET to the API base URL (no trailing /api) on Vercel.
const API_PROXY_TARGET = process.env.API_PROXY_TARGET;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  async rewrites() {
    if (!API_PROXY_TARGET) return [];
    return [
      {
        source: '/api/:path*',
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
