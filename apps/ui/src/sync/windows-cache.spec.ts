import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { todayBody } from '@/features/workout/test-today'
import type { ActivityWindows } from '@/features/workout/windows.types'
import { clearCachedToday, loadToday } from './today-cache'
import { clearCachedWindows, loadWindows } from './windows-cache'

const CACHED: ActivityWindows = {
  now: '2026-11-21T12:00:00.000Z',
  groups: [
    {
      muscleGroup: { slug: 'chest', name: 'peito' },
      state: 'open',
      lastTrainedAt: '2026-11-20T10:00:00.000Z',
      opensAt: '2026-11-21T06:00:00.000Z',
      closesAt: '2026-11-23T06:00:00.000Z',
    },
  ],
}
const NEWER: ActivityWindows = { now: '2026-11-22T12:00:00.000Z', groups: [] }

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
  await loadWindows()
}

beforeEach(async () => {
  await clearCachedWindows()
  await clearCachedToday()
})

describe('Given cached windows from a previous 200', () => {
  describe('When GET /api/windows fails by network', () => {
    it('Then loadWindows should return the cached windows', async () => {
      await cachedFromAPreviousOpening()
      failsByNetwork()

      expect(await loadWindows()).toEqual({ status: 'ok', windows: CACHED, fromCache: true })
    })
  })

  describe('When GET /api/windows answers 200 with newer windows', () => {
    it('Then loadWindows should return them and the cache should hold them from then on', async () => {
      await cachedFromAPreviousOpening()
      answers(200, NEWER)
      const fresh = await loadWindows()
      failsByNetwork()

      expect({ fresh, later: await loadWindows() }).toEqual({
        fresh: { status: 'ok', windows: NEWER },
        later: { status: 'ok', windows: NEWER, fromCache: true },
      })
    })
  })

  describe('When GET /api/windows answers 401', () => {
    it('Then loadWindows should return unauthenticated and the cache should be gone', async () => {
      await cachedFromAPreviousOpening()
      answers(401, { code: 'unauthenticated' })
      const result = await loadWindows()
      failsByNetwork()

      expect({ result, afterwards: await loadWindows() }).toEqual({
        result: { status: 'unauthenticated' },
        afterwards: { status: 'offline' },
      })
    })
  })
})

describe('Given no cached windows', () => {
  describe('When GET /api/windows fails by network', () => {
    it('Then loadWindows should return offline', async () => {
      failsByNetwork()

      expect(await loadWindows()).toEqual({ status: 'offline' })
    })
  })
})

describe('Given a cached today and cached windows, side by side in programCache', () => {
  describe('When each is read back by network failure', () => {
    it('Then neither copy should replace the other', async () => {
      answers(200, todayBody([]))
      await loadToday()
      await cachedFromAPreviousOpening()
      failsByNetwork()

      expect({ today: await loadToday(), windows: await loadWindows() }).toEqual({
        today: { status: 'ok', today: todayBody([]), fromCache: true },
        windows: { status: 'ok', windows: CACHED, fromCache: true },
      })
    })
  })
})

describe('Given a cached today', () => {
  describe('When GET /api/windows is requested without a cached copy', () => {
    it('Then loadWindows should not return the today copy', async () => {
      answers(200, todayBody([]))
      await loadToday()
      failsByNetwork()

      expect(await loadWindows()).toEqual({ status: 'offline' })
    })
  })
})
