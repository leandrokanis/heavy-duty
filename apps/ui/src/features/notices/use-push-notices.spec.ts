import { describe, expect, it, vi } from 'vitest'
import type { PushDevice } from './push-device'
import { resyncPushSubscription } from './use-push-notices'

const ENDPOINT = 'https://push.example.test/send/phone'

function deviceWith(permission: NotificationPermission, subscribed: boolean): PushDevice {
  return {
    support: () => 'supported',
    permission: () => permission,
    requestPermission: vi.fn(),
    hasWorker: async () => true,
    getSubscription: async () =>
      subscribed
        ? {
            endpoint: ENDPOINT,
            body: () => ({ endpoint: ENDPOINT, keys: { p256dh: 'BKey', auth: 'Auth' } }),
            unsubscribe: vi.fn(),
          }
        : null,
    subscribe: vi.fn(),
  }
}

function stubFetch() {
  const fetchMock = vi.fn(
    async (_input: string, _init?: RequestInit) => new Response(null, { status: 204 }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('Given the app opens with the permission granted and a subscription on the device', () => {
  describe('When the subscription is synced', () => {
    it('Then should PUT it to the API again', async () => {
      const fetchMock = stubFetch()

      await resyncPushSubscription(deviceWith('granted', true))

      expect(fetchMock.mock.calls.map(([input, init]) => [init?.method, input])).toEqual([
        ['PUT', '/api/notifications/push-subscriptions'],
      ])
    })
  })
})

describe.each([
  ['the permission not granted', deviceWith('default', true)],
  ['no subscription on the device', deviceWith('granted', false)],
])('Given the app opens with %s', (_case, device) => {
  describe('When the subscription is synced', () => {
    it('Then should send nothing', async () => {
      const fetchMock = stubFetch()

      await resyncPushSubscription(device)

      expect(fetchMock).not.toHaveBeenCalled()
    })
  })
})
