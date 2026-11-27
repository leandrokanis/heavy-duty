import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PeriodList } from '@/features/period/period.types'
import { clearCachedPeriods, loadPeriods } from './periods-cache'

const CACHED: PeriodList = { now: '2027-02-20T12:00:00.000Z', periods: [] }

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
  await clearCachedPeriods()
})

describe('Given the list of periods cached from a previous 200 (US-F11-02)', () => {
  describe('When GET /api/periods fails by network', () => {
    it('Then loadPeriods should return the cached list', async () => {
      answers(200, CACHED)
      await loadPeriods()
      failsByNetwork()

      expect(await loadPeriods()).toEqual({ status: 'ok', list: CACHED, fromCache: true })
    })
  })

  describe('When GET /api/periods answers 401', () => {
    it('Then loadPeriods should say so and drop the cached list', async () => {
      answers(200, CACHED)
      await loadPeriods()
      answers(401)
      await loadPeriods()
      failsByNetwork()

      expect(await loadPeriods()).toEqual({ status: 'offline' })
    })
  })
})
