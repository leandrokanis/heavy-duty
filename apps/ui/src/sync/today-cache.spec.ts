import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SUPINO_RETO, todayBody, todayDay } from '@/features/workout/test-today'
import { clearCachedToday, hasCachedToday, loadToday } from './today-cache'

const CACHED = todayBody()
const NEWER = todayBody([todayDay('B', 'Inferior', [SUPINO_RETO])], 'B')

function answers(status: number, body: unknown = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  )
}

function failsByNetwork() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    }),
  )
}

async function cachedFromAPreviousOpening() {
  answers(200, CACHED)
  await loadToday()
}

beforeEach(async () => {
  await clearCachedToday()
})

describe('Given a cached today from a previous 200', () => {
  describe('When GET /api/today fails by network', () => {
    it('Then loadToday should return the cached today', async () => {
      await cachedFromAPreviousOpening()
      failsByNetwork()

      expect(await loadToday()).toEqual({ status: 'ok', today: CACHED, fromCache: true })
    })
  })

  describe('When GET /api/today answers 503', () => {
    it('Then loadToday should return the cached today', async () => {
      await cachedFromAPreviousOpening()
      answers(503)

      expect(await loadToday()).toEqual({ status: 'ok', today: CACHED, fromCache: true })
    })
  })

  describe('When GET /api/today answers 200 with a newer today', () => {
    it('Then loadToday should return it and the cache should hold it from then on', async () => {
      await cachedFromAPreviousOpening()
      answers(200, NEWER)
      const fresh = await loadToday()
      failsByNetwork()

      expect({ fresh, later: await loadToday() }).toEqual({
        fresh: { status: 'ok', today: NEWER },
        later: { status: 'ok', today: NEWER, fromCache: true },
      })
    })
  })

  describe('When GET /api/today answers 401', () => {
    it('Then loadToday should return unauthenticated and the cache should be gone', async () => {
      await cachedFromAPreviousOpening()
      answers(401, { code: 'unauthenticated' })

      const result = await loadToday()

      expect({ result, cached: await hasCachedToday() }).toEqual({
        result: { status: 'unauthenticated' },
        cached: false,
      })
    })
  })
})

describe('Given no cached today', () => {
  describe('When GET /api/today fails by network', () => {
    it('Then loadToday should return offline', async () => {
      failsByNetwork()

      expect(await loadToday()).toEqual({ status: 'offline' })
    })
  })
})
