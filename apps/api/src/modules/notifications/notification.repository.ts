import { eq } from 'drizzle-orm'
import type { Database } from '../../db/connection.js'
import { notifications } from '../../db/schema.js'

export type NotificationRow = typeof notifications.$inferSelect
export type NotificationClaim = Omit<NotificationRow, 'status' | 'error' | 'finishedAt'>
export type NotificationResult = Pick<NotificationRow, 'status' | 'error' | 'finishedAt'>

// The unique key of the notice and the channel takes the row once; false when another tick, or a
// run before a restart, already took it.
export function claimNotification(db: Database, claim: NotificationClaim): boolean {
  const inserted = db
    .insert(notifications)
    .values(claim)
    .onConflictDoNothing({ target: [notifications.noticeKey, notifications.channel] })
    .returning({ id: notifications.id })
    .all()
  return inserted.length > 0
}

export function finishNotification(db: Database, id: string, result: NotificationResult): void {
  db.update(notifications).set(result).where(eq(notifications.id, id)).run()
}

export function listNotifications(db: Database): NotificationRow[] {
  return db.select().from(notifications).orderBy(notifications.id).all()
}
