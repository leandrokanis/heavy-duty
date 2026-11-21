import { describe, expect, it } from 'vitest'
import manifest from './manifest'

describe('Given the manifest', () => {
  describe('When it is generated', () => {
    it('Then should declare the standalone display and the Heavy Duty name', () => {
      expect(manifest()).toMatchObject({
        name: 'Heavy Duty',
        short_name: 'Heavy Duty',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
      })
    })
  })
})
