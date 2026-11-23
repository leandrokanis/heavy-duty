import { describe, expect, it, vi } from 'vitest'
import type { ActivityWindows } from './windows.types'
import { fetchWindows } from './windows-client'

const WINDOWS: ActivityWindows = {
  now: '2026-11-21T12:00:00.000Z',
  groups: [
    {
      muscleGroup: { slug: 'chest', name: 'peito' },
      state: 'open',
      lastTrainedAt: '2026-11-20T10:00:00.000Z',
      opensAt: '2026-11-21T06:00:00.000Z',
      closesAt: '2026-11-23T06:00:00.000Z',
    },
  ],
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

describe('Given the API answers GET /api/windows', () => {
  describe('When it answers 200 with the windows', () => {
    it('Then should return ok with the body', async () => {
      stubFetch(json(200, WINDOWS))

      expect(await fetchWindows()).toEqual({ status: 'ok', windows: WINDOWS })
    })
  })

  describe('When it answers 401', () => {
    it('Then should return unauthenticated', async () => {
      stubFetch(json(401, { code: 'unauthenticated' }))

      expect(await fetchWindows()).toEqual({ status: 'unauthenticated' })
    })
  })

  describe('When it answers 500', () => {
    it('Then should return offline', async () => {
      stubFetch(json(500, { code: 'internal_error' }))

      expect(await fetchWindows()).toEqual({ status: 'offline' })
    })
  })

  describe('When the network fails', () => {
    it('Then should return offline', async () => {
      stubFetch(new TypeError('Failed to fetch'))

      expect(await fetchWindows()).toEqual({ status: 'offline' })
    })
  })

  describe('When the request goes out', () => {
    it('Then should call /api/windows with same-origin credentials', async () => {
      const fetchMock = stubFetch(json(200, WINDOWS))

      await fetchWindows()

      expect(fetchMock).toHaveBeenCalledWith('/api/windows', { credentials: 'same-origin' })
    })
  })
})
