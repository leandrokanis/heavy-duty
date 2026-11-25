import { describe, expect, it, vi } from 'vitest'
import { deletePushSubscription, fetchPushKey, savePushSubscription } from './push-client'

const SUBSCRIPTION = {
  endpoint: 'https://push.example.test/send/abc',
  keys: { p256dh: 'BPublicKeyOfTheBrowser', auth: 'AuthSecret' },
}

function stubFetch(response: Response | Error) {
  const fetchMock = vi.fn(async (_input: string, _init?: RequestInit) => {
    if (response instanceof Error) throw response
    return response
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('Given the API answers GET /api/notifications/push-key', () => {
  describe('When it answers 200', () => {
    it('Then should return ok with the key', async () => {
      stubFetch(
        new Response(JSON.stringify({ configured: true, publicKey: 'key' }), { status: 200 }),
      )

      expect(await fetchPushKey()).toEqual({
        status: 'ok',
        pushKey: { configured: true, publicKey: 'key' },
      })
    })
  })

  describe('When it answers 401', () => {
    it('Then should return unauthenticated', async () => {
      stubFetch(new Response('{}', { status: 401 }))

      expect(await fetchPushKey()).toEqual({ status: 'unauthenticated' })
    })
  })

  describe('When the network fails', () => {
    it('Then should return offline', async () => {
      stubFetch(new TypeError('Failed to fetch'))

      expect(await fetchPushKey()).toEqual({ status: 'offline' })
    })
  })
})

describe('Given a subscription of the browser', () => {
  describe('When it is saved and the API answers 204', () => {
    it('Then should PUT the endpoint and the keys and return ok', async () => {
      const fetchMock = stubFetch(new Response(null, { status: 204 }))

      const result = await savePushSubscription(SUBSCRIPTION)

      expect({ result, call: fetchMock.mock.calls[0] }).toEqual({
        result: 'ok',
        call: [
          '/api/notifications/push-subscriptions',
          {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(SUBSCRIPTION),
          },
        ],
      })
    })
  })

  describe('When it is saved and the API answers 400', () => {
    it('Then should return failed', async () => {
      stubFetch(new Response('{}', { status: 400 }))

      expect(await savePushSubscription(SUBSCRIPTION)).toBe('failed')
    })
  })

  describe('When it is removed and the API answers 204', () => {
    it('Then should DELETE by the endpoint and return ok', async () => {
      const fetchMock = stubFetch(new Response(null, { status: 204 }))

      const result = await deletePushSubscription(SUBSCRIPTION.endpoint)

      expect({ result, init: fetchMock.mock.calls[0]?.[1] }).toEqual({
        result: 'ok',
        init: {
          method: 'DELETE',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ endpoint: SUBSCRIPTION.endpoint }),
        },
      })
    })
  })

  describe('When it is removed and the network fails', () => {
    it('Then should return failed', async () => {
      stubFetch(new TypeError('Failed to fetch'))

      expect(await deletePushSubscription(SUBSCRIPTION.endpoint)).toBe('failed')
    })
  })
})
