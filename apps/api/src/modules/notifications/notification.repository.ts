import { and, desc, eq } from 'drizzle-orm'
import type { Database } from '../../db/connection.js'
import { notifications } from '../../db/schema.js'

export type NotificationRow = typeof notifications.$inferSelect
export type NotificationClaim = Omit<
  NotificationRow,
  'status' | 'error' | 'finishedAt' | 'unsubscribeTokenHash'
>
export type NotificationResult = Pick<NotificationRow, 'status' | 'error' | 'finishedAt'> &
  Partial<Pick<NotificationRow, 'unsubscribeTokenHash'>>

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

export type NoticeChannelName = NotificationRow['channel']

export function findLastSentAt(db: Database, channel: NoticeChannelName): string | null {
  const row = db
    .select({ finishedAt: notifications.finishedAt })
    .from(notifications)
    .where(and(eq(notifications.channel, channel), eq(notifications.status, 'sent')))
    .orderBy(desc(notifications.finishedAt))
    .limit(1)
    .get()
  return row?.finishedAt ?? null
}

export function listRecentFailures(
  db: Database,
  channel: NoticeChannelName,
  limit: number,
): Pick<NotificationRow, 'kind' | 'letter' | 'error' | 'finishedAt'>[] {
  return db
    .select({
      kind: notifications.kind,
      letter: notifications.letter,
      error: notifications.error,
      finishedAt: notifications.finishedAt,
    })
    .from(notifications)
    .where(and(eq(notifications.channel, channel), eq(notifications.status, 'failed')))
    .orderBy(desc(notifications.finishedAt))
    .limit(limit)
    .all()
}

export function hasEmailWithUnsubscribeTokenHash(db: Database, tokenHash: string): boolean {
  const row = db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(eq(notifications.channel, 'email'), eq(notifications.unsubscribeTokenHash, tokenHash)),
    )
    .limit(1)
    .get()
  return row !== undefined
}
