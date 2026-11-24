import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MuscleGroupLevels } from '@/features/workout/levels.types'
import { clearCachedLevels, loadLevels } from './levels-cache'
import { clearCachedWindows, loadWindows } from './windows-cache'

const CACHED: MuscleGroupLevels = {
  now: '2026-11-21T12:00:00.000Z',
  groups: [
    {
      muscleGroup: { slug: 'chest', name: 'peito' },
      level: 3,
      points: 41,
      levelCost: 46,
      bestLevel: 3,
      tier: 'bronze',
    },
  ],
}
const NEWER: MuscleGroupLevels = { now: '2026-11-22T12:00:00.000Z', groups: [] }

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
  await loadLevels()
}

beforeEach(async () => {
  await clearCachedLevels()
  await clearCachedWindows()
})

describe('Given cached levels from a previous 200', () => {
  describe('When GET /api/levels fails by network', () => {
    it('Then loadLevels should return the cached levels', async () => {
      await cachedFromAPreviousOpening()
      failsByNetwork()

      expect(await loadLevels()).toEqual({ status: 'ok', levels: CACHED, fromCache: true })
    })
  })

  describe('When GET /api/levels answers 200 with newer levels', () => {
    it('Then loadLevels should return them and the cache should hold them from then on', async () => {
      await cachedFromAPreviousOpening()
      answers(200, NEWER)
      const fresh = await loadLevels()
      failsByNetwork()

      expect({ fresh, later: await loadLevels() }).toEqual({
        fresh: { status: 'ok', levels: NEWER },
        later: { status: 'ok', levels: NEWER, fromCache: true },
      })
    })
  })

  describe('When GET /api/levels answers 401', () => {
    it('Then loadLevels should return unauthenticated and the cache should be gone', async () => {
      await cachedFromAPreviousOpening()
      answers(401, { code: 'unauthenticated' })
      const result = await loadLevels()
      failsByNetwork()

      expect({ result, afterwards: await loadLevels() }).toEqual({
        result: { status: 'unauthenticated' },
        afterwards: { status: 'offline' },
      })
    })
  })
})

describe('Given cached windows and no cached levels', () => {
  describe('When GET /api/levels fails by network', () => {
    it('Then loadLevels should return offline, not the windows copy', async () => {
      answers(200, { now: '2026-11-21T12:00:00.000Z', groups: [] })
      await loadWindows()
      failsByNetwork()

      expect(await loadLevels()).toEqual({ status: 'offline' })
    })
  })
})
