import { afterEach, describe, expect, it, vi } from 'vitest'
import { SEND_TIMEOUT_MS } from './workout.config'
import type { SendOutcome } from './workout-set.types'
import type { CorrectWorkoutSetBody } from './workout-set-correction.types'
import { patchWorkoutSet } from './workout-set-correction-client'

const WORKOUT_ID = '0193a1b2-0000-7000-8000-000000000601'
const SET_ID = '0193a1b2-0000-7000-8000-000000000501'

const BODY: CorrectWorkoutSetBody = { loadG: 42500, reps: 10 }

function json(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), { status })
}

afterEach(() => {
  vi.useRealTimers()
})

describe('Given a corrected set to send', () => {
  describe('When patchWorkoutSet is called', () => {
    it('Then should PATCH the body as JSON to the set of the workout with same-origin credentials', async () => {
      const fetchMock = vi.fn(async () => json(200))
      vi.stubGlobal('fetch', fetchMock)

      await patchWorkoutSet(WORKOUT_ID, SET_ID, BODY)

      expect(fetchMock).toHaveBeenCalledWith(`/api/workouts/${WORKOUT_ID}/sets/${SET_ID}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(BODY),
        credentials: 'same-origin',
        signal: expect.any(AbortSignal),
      })
    })
  })

  describe.each<{ status: number; outcome: SendOutcome }>([
    { status: 200, outcome: { status: 'confirmed' } },
    {
      status: 400,
      outcome: {
        status: 'rejected',
        code: 'workout_set_load_invalid',
        message: 'Dado inválido',
      },
    },
    {
      status: 404,
      outcome: { status: 'rejected', code: 'workout_set_not_found', message: 'Dado inválido' },
    },
    {
      status: 409,
      outcome: { status: 'rejected', code: 'workout_set_id_conflict', message: 'Dado inválido' },
    },
    {
      status: 422,
      outcome: { status: 'rejected', code: 'program_not_found', message: 'Dado inválido' },
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

      expect(await patchWorkoutSet(WORKOUT_ID, SET_ID, BODY)).toEqual(outcome)
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

      expect(await patchWorkoutSet(WORKOUT_ID, SET_ID, BODY)).toEqual({ status: 'retry' })
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

      const result = patchWorkoutSet(WORKOUT_ID, SET_ID, BODY)
      await vi.advanceTimersByTimeAsync(SEND_TIMEOUT_MS)

      expect(await result).toEqual({ status: 'retry' })
    })
  })
})
