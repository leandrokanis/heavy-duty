import withSerwistInit from '@serwist/next'
import type { NextConfig } from 'next'
import { precacheEntries } from './src/precache-entries'

const isDevelopment = process.env.NODE_ENV === 'development'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The game package ships TypeScript source; only the API image compiles it, see ADR-034.
  transpilePackages: ['@heavy-duty/game'],
  // The dev proxy of compose.yaml serves the app from 127.0.0.1:${PROXY_PORT}.
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  // The consent screen must not be framed (clickjacking) nor leak its query, see ADR-020.
  async headers() {
    return [
      {
        source: '/autorizar',
        headers: [
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
    ]
  },
}

const withSerwist = withSerwistInit({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  additionalPrecacheEntries: precacheEntries,
  // The queue sends on the online event; a page reload there would cut the workout on screen.
  reloadOnOnline: false,
})

// Serwist adds a webpack config that next dev with Turbopack rejects, see ADR-009.
export default isDevelopment ? nextConfig : withSerwist(nextConfig)
