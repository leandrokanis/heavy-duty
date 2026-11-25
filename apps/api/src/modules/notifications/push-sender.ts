import webpush from 'web-push'
import type { PushConfig } from '../../config/notifications-env.js'

export type PushTarget = { endpoint: string; keys: { p256dh: string; auth: string } }

// The service worker shows every message, so a message always carries a title (ADR-035).
export type PushMessage = {
  title: string
  body: string
  tag: string
  url: string
  // A notice past its event is noise, so the push service drops it after this time.
  ttlSeconds: number
}

export type PushOutcome =
  | { status: 'sent' }
  | { status: 'gone' }
  | { status: 'failed'; reason: string }

export type PushSender = {
  send: (target: PushTarget, message: PushMessage) => Promise<PushOutcome>
}

type SendNotification = typeof webpush.sendNotification

const GONE_STATUS_CODES: ReadonlySet<number> = new Set([404, 410])

// The reason never carries the endpoint or the error text, as both hold the capability URL.
function outcomeOf(error: unknown): PushOutcome {
  const statusCode =
    typeof error === 'object' && error !== null && 'statusCode' in error
      ? Number(error.statusCode)
      : undefined
  if (statusCode !== undefined && GONE_STATUS_CODES.has(statusCode)) return { status: 'gone' }
  if (statusCode !== undefined && Number.isInteger(statusCode)) {
    return { status: 'failed', reason: `push service answered ${statusCode}` }
  }
  return { status: 'failed', reason: 'push request failed' }
}

export function createWebPushSender(
  config: PushConfig,
  sendNotification: SendNotification = webpush.sendNotification,
): PushSender {
  return {
    async send(target, { ttlSeconds, ...message }) {
      try {
        await sendNotification(target, JSON.stringify(message), {
          vapidDetails: config,
          TTL: ttlSeconds,
          urgency: 'normal',
        })
        return { status: 'sent' }
      } catch (error) {
        return outcomeOf(error)
      }
    },
  }
}
