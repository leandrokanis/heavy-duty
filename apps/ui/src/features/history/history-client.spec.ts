import { describe, expect, it, vi } from 'vitest'
import type { HistoryWorkout } from './history.types'
import { fetchWorkoutHistory } from './history-client'

const WORKOUT: HistoryWorkout = {
  id: '0193a1b2-0000-7000-8000-000000000601',
  program: { id: '0193a1b2-0000-7000-8000-000000000301', name: 'Programa 1' },
  letter: 'A',
  label: 'Superior',
  startedAt: '2026-11-21T18:30:00.000Z',
  finishedAt: '2026-11-21T19:20:00.000Z',
  endReason: 'completed',
  exercises: [],
  leftOut: [],
}

const RANGE = {
  fromMs: Date.parse('2026-08-23T13:00:00.000Z'),
  toMs: Date.parse('2026-11-23T13:00:00.000Z'),
}

function stubFetch(response: Response | Error) {
  const fetchMock = vi.fn(async () => {
    if (response instanceof Error) throw response
    return response
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function json(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), { status })
}

describe('Given the API answers GET /api/workouts', () => {
  describe('When it answers 200 with the workouts', () => {
    it('Then should return ok with the workouts', async () => {
      stubFetch(json(200, { workouts: [WORKOUT] }))

      expect(await fetchWorkoutHistory(RANGE)).toEqual({ status: 'ok', workouts: [WORKOUT] })
    })
  })

  describe('When it answers 401', () => {
    it('Then should return unauthenticated', async () => {
      stubFetch(json(401, { code: 'unauthenticated' }))

      expect(await fetchWorkoutHistory(RANGE)).toEqual({ status: 'unauthenticated' })
    })
  })

  describe('When it answers 500', () => {
    it('Then should return offline', async () => {
      stubFetch(json(500, { code: 'internal_error' }))

      expect(await fetchWorkoutHistory(RANGE)).toEqual({ status: 'offline' })
    })
  })

  describe('When the network fails', () => {
    it('Then should return offline', async () => {
      stubFetch(new TypeError('Failed to fetch'))

      expect(await fetchWorkoutHistory(RANGE)).toEqual({ status: 'offline' })
    })
  })

  describe('When the request goes out', () => {
    it('Then should ask the interval as UTC instants with same-origin credentials', async () => {
      const fetchMock = stubFetch(json(200, { workouts: [] }))

      await fetchWorkoutHistory(RANGE)

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/workouts?from=2026-08-23T13%3A00%3A00.000Z&to=2026-11-23T13%3A00%3A00.000Z',
        { credentials: 'same-origin' },
      )
    })
  })
})
