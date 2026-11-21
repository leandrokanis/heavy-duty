import { randomUUID } from 'node:crypto'
import withSerwistInit from '@serwist/next'
import type { NextConfig } from 'next'

const isDevelopment = process.env.NODE_ENV === 'development'

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
  additionalPrecacheEntries: [{ url: '/~offline', revision: randomUUID() }],
})

// Serwist adds a webpack config that next dev with Turbopack rejects, see ADR-009.
export default isDevelopment ? nextConfig : withSerwist(nextConfig)
