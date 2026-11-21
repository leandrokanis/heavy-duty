import { describe, expect, it } from 'vitest'
import nextConfig from '../next.config'

describe('Given the exported next.config.ts', () => {
  describe('When its headers are read', () => {
    it('Then /autorizar should forbid framing and send no referrer', async () => {
      const headers = (await nextConfig.headers?.()) ?? []

      expect(headers.find((rule) => rule.source === '/autorizar')?.headers).toEqual([
        { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'no-referrer' },
      ])
    })
  })
})
