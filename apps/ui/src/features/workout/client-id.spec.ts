import { describe, expect, it } from 'vitest'
import { createClientId } from './client-id'

const NOW_MS = Date.UTC(2026, 10, 21, 18, 30, 0)

describe('Given an instant in milliseconds', () => {
  describe('When createClientId is called with it', () => {
    it('Then should return a version 7 UUID whose leading 48 bits hold the instant', () => {
      const id = createClientId(NOW_MS)
      const hex = id.replaceAll('-', '')

      expect({
        format: /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id),
        instantMs: Number.parseInt(hex.slice(0, 12), 16),
      }).toEqual({ format: true, instantMs: NOW_MS })
    })
  })
})
