import { describe, expect, it } from 'vitest'
import { readPublicPngSize } from '@/test/png'
import manifest from './manifest'

describe('Given the manifest', () => {
  describe('When it is generated', () => {
    it('Then should declare the standalone display, the start URL and scope, the language and the theme colors', () => {
      expect(manifest()).toMatchObject({
        name: 'Heavy Duty',
        short_name: 'Heavy Duty',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#1c1c1e',
        background_color: '#1c1c1e',
      })
    })

    it('Then should declare a 192 and a 512 PNG icon with purpose any and a 512 PNG icon with purpose maskable', () => {
      const icons = (manifest().icons ?? []).map(({ sizes, type, purpose }) => ({
        sizes,
        type,
        purpose,
      }))

      expect(icons).toEqual([
        { sizes: '192x192', type: 'image/png', purpose: 'any' },
        { sizes: '512x512', type: 'image/png', purpose: 'any' },
        { sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ])
    })

    it('Then each icon file under public/ should be a PNG whose IHDR size matches the declared size', () => {
      const icons = manifest().icons ?? []

      const mismatches = icons.filter((icon) => {
        const size = readPublicPngSize(icon.src)
        return !size.isPng || `${size.width}x${size.height}` !== icon.sizes
      })

      expect({ count: icons.length, mismatches }).toEqual({ count: 3, mismatches: [] })
    })
  })
})
