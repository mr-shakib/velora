import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
};

// Only apply next-pwa in production to avoid Turbopack conflicts in dev
if (process.env.NODE_ENV === 'production') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'cloudinary-images',
          expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /\/api\/(memories|timeline|planner|bucket|countdowns)/,
        handler: 'NetworkFirst',
        options: { cacheName: 'api-data', expiration: { maxAgeSeconds: 5 * 60 } },
      },
    ],
  });
  module.exports = withPWA(nextConfig);
} else {
  module.exports = nextConfig;
}
