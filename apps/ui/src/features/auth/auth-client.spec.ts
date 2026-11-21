import { describe, expect, it, vi } from 'vitest'
import { fetchSession, signOut } from './auth-client'

function stubCaches(names: string[]) {
  const deleted: string[] = []
  vi.stubGlobal('caches', {
    keys: async () => names,
    delete: async (name: string) => {
      deleted.push(name)
      return true
    },
  })
  return deleted
}

describe('Given caches named serwist-precache-v2-x, pages and others', () => {
  describe('When signOut is called', () => {
    it('Then should request DELETE /api/auth/session and delete pages and others but keep serwist-precache-v2-x', async () => {
      const fetchMock = vi.fn(async () => new Response(null, { status: 204 }))
      vi.stubGlobal('fetch', fetchMock)
      const deleted = stubCaches(['serwist-precache-v2-x', 'pages', 'others'])

      await signOut()

      expect({ requests: fetchMock.mock.calls, deleted: deleted.sort() }).toEqual({
        requests: [['/api/auth/session', { method: 'DELETE', credentials: 'same-origin' }]],
        deleted: ['others', 'pages'],
      })
    })
  })
})

describe('Given the session endpoint', () => {
  describe('When it answers 200, 401 or the network fails', () => {
    it('Then fetchSession should return authenticated, unauthenticated and offline', async () => {
      const answers = [
        async () => new Response('{}', { status: 200 }),
        async () => new Response('{}', { status: 401 }),
        async () => {
          throw new TypeError('Failed to fetch')
        },
      ]
      const fetchMock = vi.fn()
      for (const answer of answers) fetchMock.mockImplementationOnce(answer)
      vi.stubGlobal('fetch', fetchMock)

      const states = [await fetchSession(), await fetchSession(), await fetchSession()]

      expect({ states, request: fetchMock.mock.calls[0] }).toEqual({
        states: ['authenticated', 'unauthenticated', 'offline'],
        request: ['/api/auth/session', { credentials: 'same-origin' }],
      })
    })
  })
})
