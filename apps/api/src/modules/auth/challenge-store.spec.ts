import { describe, expect, it } from 'vitest'
import { createChallengeStore } from './challenge-store.js'

const T0 = new Date('2026-11-21T12:00:00.000Z')
const TTL_MS = 5 * 60 * 1000

function createStoreWithClock(capacity = 100) {
  let now = T0
  const store = createChallengeStore({ now: () => now, ttlMs: TTL_MS, capacity })
  return {
    store,
    advance: (ms: number) => {
      now = new Date(now.getTime() + ms)
    },
  }
}

describe('Given a sign-in challenge issued by the store', () => {
  describe('When it is consumed twice', () => {
    it('Then the first consume should succeed and the second should fail', () => {
      const { store } = createStoreWithClock()
      const challenge = store.issue('sign-in')

      expect([store.consume(challenge, 'sign-in'), store.consume(challenge, 'sign-in')]).toEqual([
        true,
        false,
      ])
    })
  })

  describe('When it is consumed as an enrollment challenge', () => {
    it('Then should fail', () => {
      const { store } = createStoreWithClock()
      const challenge = store.issue('sign-in')

      expect(store.consume(challenge, 'enrollment')).toBe(false)
    })
  })

  describe('When it is consumed 5 minutes and 1 ms after it was issued', () => {
    it('Then should fail', () => {
      const { store, advance } = createStoreWithClock()
      const challenge = store.issue('sign-in')

      advance(TTL_MS + 1)

      expect(store.consume(challenge, 'sign-in')).toBe(false)
    })
  })

  describe('When its value is read', () => {
    it('Then should be base64url with at least 32 bytes', () => {
      const { store } = createStoreWithClock()

      const challenge = store.issue('sign-in')

      expect({
        isBase64Url: /^[A-Za-z0-9_-]+$/.test(challenge),
        bytes: Buffer.from(challenge, 'base64url').length >= 32,
      }).toEqual({ isBase64Url: true, bytes: true })
    })
  })
})

describe('Given a store with capacity 2', () => {
  describe('When a third challenge is issued', () => {
    it('Then should drop the oldest challenge and keep the newer ones', () => {
      const { store } = createStoreWithClock(2)
      const first = store.issue('sign-in')
      const second = store.issue('sign-in')
      const third = store.issue('sign-in')

      expect([
        store.consume(first, 'sign-in'),
        store.consume(second, 'sign-in'),
        store.consume(third, 'sign-in'),
      ]).toEqual([false, true, true])
    })
  })
})
