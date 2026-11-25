/// <reference lib="webworker" />
import { type PrecacheEntry, Serwist, type SerwistGlobalConfig } from 'serwist'
import { appPathOf, noticeOf, openApp } from './sw-push'
import { runtimeCaching } from './sw-runtime-caching'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
})

serwist.addEventListeners()

function dataOf(event: PushEvent): unknown {
  try {
    return event.data?.json() ?? null
  } catch {
    return null
  }
}

self.addEventListener('push', (event) => {
  const { title, options } = noticeOf(dataOf(event))
  event.waitUntil(self.registration.showNotification(title, options))
})

// The notice opens the workout of the day (decision 7 of wave 7a).
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(openApp(self.clients, appPathOf(event.notification.data?.url)))
})
