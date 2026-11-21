import { afterEach, describe, expect, it, vi } from 'vitest'
import { SEND_TIMEOUT_MS } from './workout.config'
import type { RecordWorkoutSetBody } from './workout-set.types'
import { postWorkoutSet } from './workout-set-client'

const WORKOUT_ID = '0193a1b2-0000-7000-8000-000000000601'

const BODY: RecordWorkoutSetBody = {
  id: '0193a1b2-0000-7000-8000-000000000501',
  workout: { programId: 'program-1', letter: 'A', startedAt: '2026-11-21T18:30:00.000Z' },
  plannedExerciseId: 'planned-supino',
  exerciseId: 'exercise-supino',
  setNumber: 1,
  loadG: 42500,
  reps: 10,
  performedAt: '2026-11-21T18:31:05.000Z',
}

function json(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), { status })
}

afterEach(() => {
  vi.useRealTimers()
})

describe('Given a set to send', () => {
  describe('When postWorkoutSet is called', () => {
    it('Then should POST the body as JSON to the sets of the workout with same-origin credentials', async () => {
      const fetchMock = vi.fn(async () => json(201))
      vi.stubGlobal('fetch', fetchMock)

      await postWorkoutSet(WORKOUT_ID, BODY)

      expect(fetchMock).toHaveBeenCalledWith(`/api/workouts/${WORKOUT_ID}/sets`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(BODY),
        credentials: 'same-origin',
        signal: expect.any(AbortSignal),
      })
    })
  })

  describe.each([
    { status: 200, result: 'sent' },
    { status: 201, result: 'sent' },
    { status: 401, result: 'failed' },
    { status: 409, result: 'failed' },
    { status: 422, result: 'failed' },
    { status: 500, result: 'failed' },
  ])('When the API answers $status', ({ status, result }) => {
    it(`Then should resolve ${result}`, async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => json(status)),
      )

      expect(await postWorkoutSet(WORKOUT_ID, BODY)).toBe(result)
    })
  })

  describe('When the network fails', () => {
    it('Then should resolve failed', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          throw new TypeError('Failed to fetch')
        }),
      )

      expect(await postWorkoutSet(WORKOUT_ID, BODY)).toBe('failed')
    })
  })

  describe('When the API does not answer within the send timeout', () => {
    it('Then should abort the request and resolve failed', async () => {
      vi.useFakeTimers()
      vi.stubGlobal(
        'fetch',
        vi.fn(
          (_url: string, init: RequestInit) =>
            new Promise<Response>((_resolve, reject) => {
              init.signal?.addEventListener('abort', () => reject(init.signal?.reason))
            }),
        ),
      )

      const result = postWorkoutSet(WORKOUT_ID, BODY)
      await vi.advanceTimersByTimeAsync(SEND_TIMEOUT_MS)

      expect(await result).toBe('failed')
    })
  })
})
