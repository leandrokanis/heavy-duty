import { afterEach, describe, expect, it, vi } from 'vitest'
import { SEND_TIMEOUT_MS } from './workout.config'
import { deleteWorkout } from './workout-discard-client'
import type { SendOutcome } from './workout-set.types'

const WORKOUT_ID = '0193a1b2-0000-7000-8000-000000000601'

function json(status: number, body: unknown = {}) {
  return new Response(status === 204 ? null : JSON.stringify(body), { status })
}

afterEach(() => {
  vi.useRealTimers()
})

describe('Given a workout to remove', () => {
  describe('When deleteWorkout is called', () => {
    it('Then should send DELETE to the workout with same-origin credentials and no body', async () => {
      const fetchMock = vi.fn(async () => json(204))
      vi.stubGlobal('fetch', fetchMock)

      await deleteWorkout(WORKOUT_ID)

      expect(fetchMock).toHaveBeenCalledWith(`/api/workouts/${WORKOUT_ID}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        signal: expect.any(AbortSignal),
      })
    })
  })

  describe.each<{ status: number; outcome: SendOutcome }>([
    { status: 200, outcome: { status: 'confirmed' } },
    { status: 204, outcome: { status: 'confirmed' } },
    { status: 404, outcome: { status: 'confirmed' } },
    {
      status: 400,
      outcome: { status: 'rejected', code: 'invalid_request', message: 'Dado inválido' },
    },
    { status: 409, outcome: { status: 'rejected', code: 'conflict', message: 'Dado inválido' } },
    {
      status: 422,
      outcome: { status: 'rejected', code: 'unprocessable', message: 'Dado inválido' },
    },
    { status: 401, outcome: { status: 'retry' } },
    { status: 403, outcome: { status: 'retry' } },
    { status: 408, outcome: { status: 'retry' } },
    { status: 429, outcome: { status: 'retry' } },
    { status: 500, outcome: { status: 'retry' } },
  ])('When the API answers $status', ({ status, outcome }) => {
    it(`Then the outcome should be ${JSON.stringify(outcome)}`, async () => {
      const code = outcome.status === 'rejected' ? outcome.code : 'workout_not_found'
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => json(status, { code, message: 'Dado inválido' })),
      )

      expect(await deleteWorkout(WORKOUT_ID)).toEqual(outcome)
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

      expect(await deleteWorkout(WORKOUT_ID)).toEqual({ status: 'retry' })
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

      const result = deleteWorkout(WORKOUT_ID)
      await vi.advanceTimersByTimeAsync(SEND_TIMEOUT_MS)

      expect(await result).toEqual({ status: 'retry' })
    })
  })
})
