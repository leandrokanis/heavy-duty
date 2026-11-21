import { afterEach, describe, expect, it, vi } from 'vitest'
import { SEND_TIMEOUT_MS } from './workout.config'
import type { SendOutcome } from './workout-set.types'
import type { RecordWorkoutSkipBody } from './workout-skip.types'
import { postWorkoutSkip } from './workout-skip-client'

const WORKOUT_ID = '0193a1b2-0000-7000-8000-000000000601'

const BODY: RecordWorkoutSkipBody = {
  plannedExerciseId: '0193a1b2-0000-7000-8000-000000000402',
  skippedAt: '2026-11-21T18:40:00.000Z',
}

function json(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), { status })
}

afterEach(() => {
  vi.useRealTimers()
})

describe('Given a skipped exercise to send', () => {
  describe('When postWorkoutSkip is called', () => {
    it('Then should POST the body as JSON to the skips of the workout with same-origin credentials', async () => {
      const fetchMock = vi.fn(async () => json(201))
      vi.stubGlobal('fetch', fetchMock)

      await postWorkoutSkip(WORKOUT_ID, BODY)

      expect(fetchMock).toHaveBeenCalledWith(`/api/workouts/${WORKOUT_ID}/skips`, {
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
      outcome: {
        status: 'rejected',
        code: 'workout_skipped_before_start',
        message: 'Dado inválido',
      },
    },
    {
      status: 404,
      outcome: { status: 'rejected', code: 'workout_not_found', message: 'Dado inválido' },
    },
    {
      status: 409,
      outcome: { status: 'rejected', code: 'workout_skip_conflict', message: 'Dado inválido' },
    },
    {
      status: 422,
      outcome: { status: 'rejected', code: 'planned_exercise_not_found', message: 'Dado inválido' },
    },
    { status: 401, outcome: { status: 'retry' } },
    { status: 403, outcome: { status: 'retry' } },
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

      expect(await postWorkoutSkip(WORKOUT_ID, BODY)).toEqual(outcome)
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

      expect(await postWorkoutSkip(WORKOUT_ID, BODY)).toEqual({ status: 'retry' })
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

      const result = postWorkoutSkip(WORKOUT_ID, BODY)
      await vi.advanceTimersByTimeAsync(SEND_TIMEOUT_MS)

      expect(await result).toEqual({ status: 'retry' })
    })
  })
})
