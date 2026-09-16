import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.cdninstagram.com' },
      { protocol: 'https', hostname: '**.fbcdn.net' },
      { protocol: 'https', hostname: '**.tiktokcdn.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: '**.twimg.com' },
      { protocol: 'https', hostname: '**' }, // fallback for web thumbnails
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'savedlens.vercel.app'],
    },
  },
}

export default nextConfig
