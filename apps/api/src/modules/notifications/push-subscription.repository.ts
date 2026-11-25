import { inArray } from 'drizzle-orm'
import type { Database } from '../../db/connection.js'
import { pushSubscriptions } from '../../db/schema.js'

export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect

export function upsertPushSubscription(db: Database, row: PushSubscriptionRow): void {
  db.insert(pushSubscriptions)
    .values(row)
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { p256dh: row.p256dh, auth: row.auth, updatedAt: row.updatedAt },
    })
    .run()
}

export function deletePushSubscriptions(db: Database, endpoints: readonly string[]): void {
  if (endpoints.length === 0) return
  db.delete(pushSubscriptions)
    .where(inArray(pushSubscriptions.endpoint, [...endpoints]))
    .run()
}

export function listPushSubscriptions(db: Database): PushSubscriptionRow[] {
  return db.select().from(pushSubscriptions).orderBy(pushSubscriptions.id).all()
}
