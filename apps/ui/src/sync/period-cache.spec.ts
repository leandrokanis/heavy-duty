import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { testPeriod } from '@/features/period/test-period'
import { clearCachedPeriod, loadPeriod, storePeriod } from './period-cache'

const CACHED = testPeriod()
const NEWER = testPeriod({ intention: 'Treinar três vezes por semana.' })

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

beforeEach(async () => {
  await clearCachedPeriod()
})

describe('Given a cached period from a previous 200', () => {
  describe('When GET /api/periods/current fails by network', () => {
    it('Then loadPeriod should return the cached period', async () => {
      answers(200, CACHED)
      await loadPeriod()
      failsByNetwork()

      expect(await loadPeriod()).toEqual({ status: 'ok', period: CACHED, fromCache: true })
    })
  })

  describe('When GET /api/periods/current answers 401', () => {
    it('Then loadPeriod should return unauthenticated and the cache should be gone', async () => {
      answers(200, CACHED)
      await loadPeriod()
      answers(401, { code: 'unauthenticated' })
      const result = await loadPeriod()
      failsByNetwork()

      expect({ result, afterwards: await loadPeriod() }).toEqual({
        result: { status: 'unauthenticated' },
        afterwards: { status: 'offline' },
      })
    })
  })
})

describe('Given the period stored after a new intention', () => {
  describe('When GET /api/periods/current fails by network', () => {
    it('Then loadPeriod should return the stored period with the intention', async () => {
      await storePeriod(NEWER)
      failsByNetwork()

      expect(await loadPeriod()).toEqual({ status: 'ok', period: NEWER, fromCache: true })
    })
  })
})

describe('Given no cached period', () => {
  describe('When GET /api/periods/current fails by network', () => {
    it('Then loadPeriod should return offline', async () => {
      failsByNetwork()

      expect(await loadPeriod()).toEqual({ status: 'offline' })
    })
  })
})
