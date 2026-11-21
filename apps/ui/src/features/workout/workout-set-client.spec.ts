import { afterEach, describe, expect, it, vi } from 'vitest'
import { SEND_TIMEOUT_MS } from './workout.config'
import type { RecordWorkoutSetBody, SendOutcome } from './workout-set.types'
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

  describe.each<{ status: number; outcome: SendOutcome }>([
    { status: 200, outcome: { status: 'confirmed' } },
    { status: 201, outcome: { status: 'confirmed' } },
    {
      status: 400,
      outcome: { status: 'rejected', code: 'validation_failed', message: 'Dado inválido' },
    },
    {
      status: 409,
      outcome: { status: 'rejected', code: 'workout_set_duplicated', message: 'Dado inválido' },
    },
    {
      status: 422,
      outcome: { status: 'rejected', code: 'planned_exercise_not_found', message: 'Dado inválido' },
    },
    { status: 401, outcome: { status: 'retry' } },
    { status: 403, outcome: { status: 'retry' } },
    { status: 404, outcome: { status: 'retry' } },
    { status: 408, outcome: { status: 'retry' } },
    { status: 429, outcome: { status: 'retry' } },
    { status: 500, outcome: { status: 'retry' } },
    { status: 503, outcome: { status: 'retry' } },
  ])('When the API answers $status', ({ status, outcome }) => {
    it(`Then the outcome should be ${JSON.stringify(outcome)}`, async () => {
      const code = outcome.status === 'rejected' ? outcome.code : 'ignored'
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => json(status, { code, message: 'Dado inválido' })),
      )

      expect(await postWorkoutSet(WORKOUT_ID, BODY)).toEqual(outcome)
    })
  })

  describe('When the API refuses with a body that is not JSON', () => {
    it('Then the outcome should be rejected with code unknown and the default message', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response('<html>bad gateway</html>', { status: 422 })),
      )

      expect(await postWorkoutSet(WORKOUT_ID, BODY)).toEqual({
        status: 'rejected',
        code: 'unknown',
        message: 'A API recusou a série.',
      })
    })
  })

  describe('When the network fails', () => {
    it('Then the outcome should be retry', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          throw new TypeError('Failed to fetch')
        }),
      )

      expect(await postWorkoutSet(WORKOUT_ID, BODY)).toEqual({ status: 'retry' })
    })
  })

  describe('When the API does not answer within the send timeout', () => {
    it('Then should abort the request and the outcome should be retry', async () => {
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

      expect(await result).toEqual({ status: 'retry' })
    })
  })
})
