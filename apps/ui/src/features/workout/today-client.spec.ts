import { describe, expect, it, vi } from 'vitest'
import { todayBody } from './test-today'
import { fetchToday } from './today-client'

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

describe('Given the API answers GET /api/today', () => {
  describe('When it answers 200 with the workout of the day', () => {
    it('Then should return ok with the body', async () => {
      stubFetch(json(200, todayBody()))

      expect(await fetchToday()).toEqual({ status: 'ok', today: todayBody() })
    })
  })

  describe('When it answers 401', () => {
    it('Then should return unauthenticated', async () => {
      stubFetch(json(401, { code: 'unauthenticated' }))

      expect(await fetchToday()).toEqual({ status: 'unauthenticated' })
    })
  })

  describe('When it answers 500', () => {
    it('Then should return offline', async () => {
      stubFetch(json(500, { code: 'internal_error' }))

      expect(await fetchToday()).toEqual({ status: 'offline' })
    })
  })

  describe('When the network fails', () => {
    it('Then should return offline', async () => {
      stubFetch(new TypeError('Failed to fetch'))

      expect(await fetchToday()).toEqual({ status: 'offline' })
    })
  })

  describe('When the request goes out', () => {
    it('Then should call /api/today with same-origin credentials', async () => {
      const fetchMock = stubFetch(json(200, todayBody()))

      await fetchToday()

      expect(fetchMock).toHaveBeenCalledWith('/api/today', { credentials: 'same-origin' })
    })
  })
})
