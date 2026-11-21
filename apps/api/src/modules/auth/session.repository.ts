import { eq, lte } from 'drizzle-orm'
import type { Database } from '../../db/connection.js'
import { authSessions } from '../../db/schema.js'

export type AuthSessionRow = typeof authSessions.$inferSelect

export function insertSession(db: Database, session: AuthSessionRow): void {
  db.insert(authSessions).values(session).run()
}

export function findSessionByTokenHash(
  db: Database,
  tokenHash: string,
): AuthSessionRow | undefined {
  return db.select().from(authSessions).where(eq(authSessions.tokenHash, tokenHash)).get()
}

export function touchSession(
  db: Database,
  id: string,
  times: { lastSeenAt: string; expiresAt: string },
): void {
  db.update(authSessions).set(times).where(eq(authSessions.id, id)).run()
}

export function deleteSessionByTokenHash(db: Database, tokenHash: string): void {
  db.delete(authSessions).where(eq(authSessions.tokenHash, tokenHash)).run()
}

export function deleteExpiredSessions(db: Database, nowIso: string): void {
  db.delete(authSessions).where(lte(authSessions.expiresAt, nowIso)).run()
}
