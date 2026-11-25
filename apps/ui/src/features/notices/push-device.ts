import type { PushSubscriptionBody } from './push-client'
import { keyBytesOf, type PushSupport, pushSupportOf, readPushEnvironment } from './push-support'

export type DeviceSubscription = {
  endpoint: string
  body: () => PushSubscriptionBody | null
  unsubscribe: () => Promise<unknown>
}

// The browser APIs behind the switch, apart so the specs can hand a fake device.
export type PushDevice = {
  support: () => PushSupport
  permission: () => NotificationPermission
  requestPermission: () => Promise<NotificationPermission>
  hasWorker: () => Promise<boolean>
  getSubscription: () => Promise<DeviceSubscription | null>
  subscribe: (publicKey: string) => Promise<DeviceSubscription>
}

function deviceSubscriptionOf(subscription: PushSubscription): DeviceSubscription {
  return {
    endpoint: subscription.endpoint,
    body: () => {
      const { keys } = subscription.toJSON()
      return keys?.p256dh && keys.auth
        ? { endpoint: subscription.endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } }
        : null
    },
    unsubscribe: () => subscription.unsubscribe(),
  }
}

// getRegistration, not ready: without a worker, as in next dev, ready never settles.
async function registration(): Promise<ServiceWorkerRegistration | undefined> {
  return navigator.serviceWorker.getRegistration()
}

export const browserPushDevice: PushDevice = {
  support: () => pushSupportOf(readPushEnvironment()),
  permission: () => Notification.permission,
  requestPermission: () => Notification.requestPermission(),
  hasWorker: async () => (await registration()) !== undefined,
  getSubscription: async () => {
    const subscription = await (await registration())?.pushManager.getSubscription()
    return subscription ? deviceSubscriptionOf(subscription) : null
  },
  subscribe: async (publicKey) => {
    const found = await registration()
    if (!found) throw new Error('no service worker')
    const subscription = await found.pushManager.subscribe({
      // Every push shows a notification; Safari takes no other choice (D44).
      userVisibleOnly: true,
      applicationServerKey: keyBytesOf(publicKey),
    })
    return deviceSubscriptionOf(subscription)
  },
}
