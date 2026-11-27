import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Medal, Medals } from '@/features/medals/medals.types'
import { clearCachedMedals, loadMedals } from './medals-cache'

const medal = (params: Partial<Medal>): Medal => ({
  code: 'first_record',
  name: 'Primeiro recorde',
  criterion: 'Registre a primeira série recorde.',
  icon: 'sparkle',
  hidden: false,
  awardedAt: null,
  subject: null,
  workoutId: null,
  ...params,
})

const NONE: Medals = { now: '2026-12-01T12:00:00.000Z', medals: [medal({})] }
const RECORD: Medals = {
  now: '2026-12-02T12:00:00.000Z',
  medals: [medal({ awardedAt: '2026-12-02T11:00:00.000Z' })],
}

function answers(status: number, body: unknown = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  )
}

describe('Given the medals module', () => {
  beforeEach(async () => {
    vi.unstubAllGlobals()
    await clearCachedMedals()
  })

  describe('When the medals are read for the first time with a medal already awarded', () => {
    it('Then it should not count the medal as awarded now', async () => {
      answers(200, RECORD)
      expect(await loadMedals()).toMatchObject({ status: 'ok', awardedNow: [] })
    })
  })

  describe('When the API awards the first record after a copy without it', () => {
    it('Then it should return the first record as awarded now', async () => {
      answers(200, NONE)
      await loadMedals()
      answers(200, RECORD)
      const loaded = await loadMedals()
      expect(loaded.status === 'ok' && loaded.awardedNow.map(({ code }) => code)).toEqual([
        'first_record',
      ])
    })
  })

  describe('When the same medals are read again', () => {
    it('Then it should return no medal as awarded now', async () => {
      answers(200, RECORD)
      await loadMedals()
      expect(await loadMedals()).toMatchObject({ awardedNow: [] })
    })
  })

  describe('When the API is out of reach after a copy', () => {
    it('Then it should return the copy, with no medal awarded now', async () => {
      answers(200, RECORD)
      await loadMedals()
      answers(503)
      expect(await loadMedals()).toEqual({
        status: 'ok',
        medals: RECORD,
        awardedNow: [],
        fromCache: true,
      })
    })
  })

  describe('When the session is gone', () => {
    it('Then it should delete the copy', async () => {
      answers(200, RECORD)
      await loadMedals()
      answers(401)
      expect(await loadMedals()).toEqual({ status: 'unauthenticated' })
      answers(503)
      expect(await loadMedals()).toEqual({ status: 'offline' })
    })
  })
})
