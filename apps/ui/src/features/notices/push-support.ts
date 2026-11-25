export type PushSupport = 'supported' | 'not-installed' | 'unsupported'

export type PushEnvironment = {
  standalone: boolean
  serviceWorker: boolean
  pushManager: boolean
  notification: boolean
}

// On the iPhone, push exists only for the app on the home screen, from iOS 16.4 (D44).
export function pushSupportOf(env: PushEnvironment): PushSupport {
  if (!env.standalone) return 'not-installed'
  if (!env.serviceWorker || !env.pushManager || !env.notification) return 'unsupported'
  return 'supported'
}

export function readPushEnvironment(): PushEnvironment {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return {
    standalone:
      iosStandalone || (window.matchMedia?.('(display-mode: standalone)').matches ?? false),
    serviceWorker: 'serviceWorker' in navigator,
    pushManager: 'PushManager' in window,
    notification: 'Notification' in window,
  }
}

export function keyBytesOf(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}
