import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { weekStartOf } from '@/features/workout/week'
import type { WeekWindows } from '@/features/workout/weekly-windows.types'
import { clearCachedWeekWindows, loadWeekWindows } from './weekly-windows-cache'

const WEDNESDAY_MS = new Date(2026, 10, 25, 15, 30).getTime()
const NEXT_MONDAY_MS = new Date(2026, 10, 30, 8, 0).getTime()

const weekOf = (nowMs: number, windowsUsed: number): WeekWindows => {
  const fromMs = weekStartOf(nowMs)
  return {
    now: new Date(nowMs).toISOString(),
    from: new Date(fromMs).toISOString(),
    to: new Date(fromMs + 7 * 24 * 60 * 60 * 1000).toISOString(),
    weeklyGoal: 6,
    windowsUsed,
    windowsMissed: 1,
    windowsOpen: 2,
    usedPercent: 80,
  }
}

function answers(status: number, body: unknown = {}) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
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
  await clearCachedWeekWindows()
})

describe('Given the workout of the day opened on Wednesday', () => {
  describe('When loadWeekWindows asks the API', () => {
    it('Then should ask GET /api/windows/week from Monday at 00:00 of the device', async () => {
      const fetchMock = answers(200, weekOf(WEDNESDAY_MS, 4))

      await loadWeekWindows(WEDNESDAY_MS)

      expect(fetchMock).toHaveBeenCalledWith(
        `/api/windows/week?from=${encodeURIComponent(new Date(weekStartOf(WEDNESDAY_MS)).toISOString())}`,
        { credentials: 'same-origin' },
      )
    })
  })
})

describe('Given a copy of this week from a previous 200', () => {
  describe('When GET /api/windows/week fails by network in the same week', () => {
    it('Then loadWeekWindows should return the copy', async () => {
      answers(200, weekOf(WEDNESDAY_MS, 4))
      await loadWeekWindows(WEDNESDAY_MS)
      failsByNetwork()

      expect(await loadWeekWindows(WEDNESDAY_MS + 60_000)).toEqual({
        status: 'ok',
        week: weekOf(WEDNESDAY_MS, 4),
        fromCache: true,
      })
    })
  })

  describe('When GET /api/windows/week fails by network in the next week', () => {
    it('Then loadWeekWindows should return offline, with no count of the past week', async () => {
      answers(200, weekOf(WEDNESDAY_MS, 4))
      await loadWeekWindows(WEDNESDAY_MS)
      failsByNetwork()

      expect(await loadWeekWindows(NEXT_MONDAY_MS)).toEqual({ status: 'offline' })
    })
  })

  describe('When GET /api/windows/week answers 200 with a newer count', () => {
    it('Then the copy should hold the newer count from then on', async () => {
      answers(200, weekOf(WEDNESDAY_MS, 4))
      await loadWeekWindows(WEDNESDAY_MS)
      answers(200, weekOf(WEDNESDAY_MS, 5))
      await loadWeekWindows(WEDNESDAY_MS)
      failsByNetwork()

      expect(await loadWeekWindows(WEDNESDAY_MS)).toMatchObject({ week: { windowsUsed: 5 } })
    })
  })

  describe('When GET /api/windows/week answers 401', () => {
    it('Then loadWeekWindows should return unauthenticated and the copy should be gone', async () => {
      answers(200, weekOf(WEDNESDAY_MS, 4))
      await loadWeekWindows(WEDNESDAY_MS)
      answers(401, { code: 'unauthenticated' })
      const result = await loadWeekWindows(WEDNESDAY_MS)
      failsByNetwork()

      expect({ result, afterwards: await loadWeekWindows(WEDNESDAY_MS) }).toEqual({
        result: { status: 'unauthenticated' },
        afterwards: { status: 'offline' },
      })
    })
  })
})
