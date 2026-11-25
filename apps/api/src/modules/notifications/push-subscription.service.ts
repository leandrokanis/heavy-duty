import type { Database } from '../../db/connection.js'
import { createId } from '../../db/id.js'
import type { PushKey, PushSubscriptionBody } from './notifications.schemas.js'
import type { PushMessage, PushSender } from './push-sender.js'
import {
  deletePushSubscriptions,
  listPushSubscriptions,
  upsertPushSubscription,
} from './push-subscription.repository.js'

export function getPushKey(publicKey: string | undefined): PushKey {
  return publicKey ? { configured: true, publicKey } : { configured: false, publicKey: null }
}

// The phone sends its subscription again on every opening, so the same endpoint only refreshes it.
export function savePushSubscription(db: Database, body: PushSubscriptionBody, now: Date): void {
  const at = now.toISOString()
  upsertPushSubscription(db, {
    id: createId(now.getTime()),
    endpoint: body.endpoint,
    p256dh: body.keys.p256dh,
    auth: body.keys.auth,
    createdAt: at,
    updatedAt: at,
  })
}

export function removePushSubscription(db: Database, endpoint: string): void {
  deletePushSubscriptions(db, [endpoint])
}

export type PushDelivery = { sent: number; gone: number; failures: string[] }

// A subscription the push service no longer knows (404 or 410) leaves the table (ADR-035).
export async function sendPushToAll(
  db: Database,
  sender: PushSender,
  message: PushMessage,
): Promise<PushDelivery> {
  const subscriptions = listPushSubscriptions(db)
  const outcomes = await Promise.all(
    subscriptions.map(async ({ endpoint, p256dh, auth }) => ({
      endpoint,
      outcome: await sender.send({ endpoint, keys: { p256dh, auth } }, message),
    })),
  )
  const gone = outcomes.filter(({ outcome }) => outcome.status === 'gone')
  deletePushSubscriptions(
    db,
    gone.map(({ endpoint }) => endpoint),
  )
  return {
    sent: outcomes.filter(({ outcome }) => outcome.status === 'sent').length,
    gone: gone.length,
    failures: outcomes.flatMap(({ outcome }) =>
      outcome.status === 'failed' ? [outcome.reason] : [],
    ),
  }
}
