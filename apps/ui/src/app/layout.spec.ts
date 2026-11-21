import { describe, expect, it } from 'vitest'
import { readPublicPngSize } from '@/test/png'
import { metadata } from './layout'

describe('Given the root layout metadata', () => {
  describe('When the iPhone reads the icons and the web app settings', () => {
    it('Then should declare a 180 x 180 PNG apple-touch-icon and keep the full screen launch', () => {
      const apple = (metadata.icons as { apple?: string } | undefined)?.apple ?? ''

      expect({
        apple,
        size: readPublicPngSize(apple),
        capable: (metadata.appleWebApp as { capable?: boolean } | undefined)?.capable,
      }).toEqual({
        apple: '/icons/apple-touch-icon.png',
        size: { isPng: true, width: 180, height: 180 },
        capable: true,
      })
    })
  })
})
