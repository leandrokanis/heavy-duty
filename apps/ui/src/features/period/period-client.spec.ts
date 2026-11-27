import { afterEach, describe, expect, it, vi } from 'vitest'
import { saveIntention } from './period-client'
import { testPeriod } from './test-period'

function answers(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Given the API with a session', () => {
  describe('When saveIntention is called', () => {
    it('Then should PUT the intention and return the period', async () => {
      const period = testPeriod({ intention: 'Treinar.' })
      const fetchMock = answers(200, period)

      const result = await saveIntention('Treinar.')

      expect({ result, call: fetchMock.mock.calls[0] }).toEqual({
        result: { status: 'ok', period },
        call: [
          '/api/periods/current/intention',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ intention: 'Treinar.' }),
          }),
        ],
      })
    })
  })

  describe('When the API refuses the intention with 400', () => {
    it('Then should return the message of the API', async () => {
      answers(400, {
        code: 'period_intention_too_long',
        message: 'a frase de intenção deve ter até 120 caracteres',
      })

      expect(await saveIntention('a'.repeat(121))).toEqual({
        status: 'rejected',
        message: 'a frase de intenção deve ter até 120 caracteres',
      })
    })
  })
})

describe('Given no signal', () => {
  describe('When saveIntention is called', () => {
    it('Then should return offline', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          throw new TypeError('Failed to fetch')
        }),
      )

      expect(await saveIntention('Treinar.')).toEqual({ status: 'offline' })
    })
  })
})
