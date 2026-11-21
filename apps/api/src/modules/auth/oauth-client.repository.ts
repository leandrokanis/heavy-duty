import { and, asc, count, eq, inArray, isNull, lt } from 'drizzle-orm'
import type { Database } from '../../db/connection.js'
import { oauthClients } from '../../db/schema.js'

export type OAuthClientRow = typeof oauthClients.$inferSelect

export function insertClient(db: Database, client: OAuthClientRow): void {
  db.insert(oauthClients).values(client).run()
}

export function findClientById(db: Database, id: string): OAuthClientRow | undefined {
  return db.select().from(oauthClients).where(eq(oauthClients.id, id)).get()
}

export function markClientApproved(db: Database, id: string, approvedAt: string): void {
  db.update(oauthClients)
    .set({ approvedAt })
    .where(and(eq(oauthClients.id, id), isNull(oauthClients.approvedAt)))
    .run()
}

export function deleteNeverApprovedCreatedBefore(db: Database, beforeIso: string): void {
  db.delete(oauthClients)
    .where(and(isNull(oauthClients.approvedAt), lt(oauthClients.createdAt, beforeIso)))
    .run()
}

export function countNeverApproved(db: Database): number {
  return (
    db.select({ n: count() }).from(oauthClients).where(isNull(oauthClients.approvedAt)).get()?.n ??
    0
  )
}

export function deleteOldestNeverApproved(db: Database, howMany: number): void {
  const oldest = db
    .select({ id: oauthClients.id })
    .from(oauthClients)
    .where(isNull(oauthClients.approvedAt))
    .orderBy(asc(oauthClients.createdAt), asc(oauthClients.id))
    .limit(howMany)
    .all()
    .map((row) => row.id)
  if (oldest.length > 0) {
    db.delete(oauthClients).where(inArray(oauthClients.id, oldest)).run()
  }
}
