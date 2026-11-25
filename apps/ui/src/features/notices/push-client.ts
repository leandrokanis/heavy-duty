export type PushKey = { configured: boolean; publicKey: string | null }

export type PushKeyResult =
  | { status: 'ok'; pushKey: PushKey }
  | { status: 'unauthenticated' }
  | { status: 'offline' }

export type PushSubscriptionBody = {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

const PUSH_KEY_PATH = '/api/notifications/push-key'
const SUBSCRIPTIONS_PATH = '/api/notifications/push-subscriptions'

export async function fetchPushKey(): Promise<PushKeyResult> {
  try {
    const response = await fetch(PUSH_KEY_PATH, { credentials: 'same-origin' })
    if (response.status === 200) {
      return { status: 'ok', pushKey: (await response.json()) as PushKey }
    }
    if (response.status === 401) return { status: 'unauthenticated' }
    return { status: 'offline' }
  } catch {
    return { status: 'offline' }
  }
}

async function send(method: 'PUT' | 'DELETE', body: unknown): Promise<'ok' | 'failed'> {
  try {
    const response = await fetch(SUBSCRIPTIONS_PATH, {
      method,
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    return response.status === 204 ? 'ok' : 'failed'
  } catch {
    return 'failed'
  }
}

export function savePushSubscription(subscription: PushSubscriptionBody): Promise<'ok' | 'failed'> {
  return send('PUT', subscription)
}

export function deletePushSubscription(endpoint: string): Promise<'ok' | 'failed'> {
  return send('DELETE', { endpoint })
}
