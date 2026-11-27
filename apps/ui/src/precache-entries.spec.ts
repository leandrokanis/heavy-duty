import { describe, expect, it } from 'vitest'
import { precacheEntries } from './precache-entries'

describe('Given the precache entries', () => {
  describe('When they are read', () => {
    it('Then should list "/~offline", "/", "/mapa" and "/periodo" with the same build revision', () => {
      expect({
        urls: precacheEntries.map(({ url }) => url),
        sameRevision: new Set(precacheEntries.map(({ revision }) => revision)).size,
      }).toEqual({ urls: ['/~offline', '/', '/mapa', '/periodo'], sameRevision: 1 })
    })
  })
})
