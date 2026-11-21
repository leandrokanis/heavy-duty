import { describe, expect, it } from 'vitest'
import { createId } from './id.js'

// UUID v7 (RFC 9562, Section 5.7): the first 48 bits hold the Unix time in milliseconds.
function readTimestampMs(id: string): number {
  return Number.parseInt(id.replaceAll('-', '').slice(0, 12), 16)
}

describe('Given two timestamps in increasing order', () => {
  const earlierMs = Date.UTC(2026, 10, 21, 8, 0, 0)
  const laterMs = Date.UTC(2026, 10, 21, 8, 0, 1)

  describe('When an ID is created for each', () => {
    it('Then should return version 7 UUIDs that sort in the same order', () => {
      const ids = [createId(laterMs), createId(earlierMs)]

      expect({
        versions: ids.map((id) => id.charAt(14)),
        timestampsMs: ids.map(readTimestampMs),
        sorted: [...ids].sort(),
      }).toEqual({
        versions: ['7', '7'],
        timestampsMs: [laterMs, earlierMs],
        sorted: [ids[1], ids[0]],
      })
    })
  })
})
