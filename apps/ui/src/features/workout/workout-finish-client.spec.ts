import { afterEach, describe, expect, it, vi } from 'vitest'
import { SEND_TIMEOUT_MS } from './workout.config'
import type { FinishWorkoutBody } from './workout-finish.types'
import { postWorkoutFinish } from './workout-finish-client'
import type { SendOutcome } from './workout-set.types'

const WORKOUT_ID = '0193a1b2-0000-7000-8000-000000000601'

const BODY: FinishWorkoutBody = {
  finishedAt: '2026-11-21T19:20:00.000Z',
  endReason: 'ended_early',
}

function json(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), { status })
}

afterEach(() => {
  vi.useRealTimers()
})

describe('Given the end of a workout to send', () => {
  describe('When postWorkoutFinish is called', () => {
    it('Then should POST the body as JSON to the finish of the workout with same-origin credentials', async () => {
      const fetchMock = vi.fn(async () => json(200))
      vi.stubGlobal('fetch', fetchMock)

      await postWorkoutFinish(WORKOUT_ID, BODY)

      expect(fetchMock).toHaveBeenCalledWith(`/api/workouts/${WORKOUT_ID}/finish`, {
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
    {
      status: 400,
      outcome: {
        status: 'rejected',
        code: 'workout_finished_before_start',
        message: 'Dado inválido',
      },
    },
    {
      status: 404,
      outcome: { status: 'rejected', code: 'workout_not_found', message: 'Dado inválido' },
    },
    {
      status: 409,
      outcome: { status: 'rejected', code: 'workout_already_finished', message: 'Dado inválido' },
    },
    {
      status: 422,
      outcome: { status: 'rejected', code: 'unprocessable', message: 'Dado inválido' },
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

      expect(await postWorkoutFinish(WORKOUT_ID, BODY)).toEqual(outcome)
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

      expect(await postWorkoutFinish(WORKOUT_ID, BODY)).toEqual({ status: 'retry' })
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

      const result = postWorkoutFinish(WORKOUT_ID, BODY)
      await vi.advanceTimersByTimeAsync(SEND_TIMEOUT_MS)

      expect(await result).toEqual({ status: 'retry' })
    })
  })
})
