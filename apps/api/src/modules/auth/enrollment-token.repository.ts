import { and, eq, gt, isNull, lte } from 'drizzle-orm'
import type { Database } from '../../db/connection.js'
import { enrollmentTokens } from '../../db/schema.js'

export type EnrollmentTokenRow = typeof enrollmentTokens.$inferSelect

export function insertEnrollmentToken(db: Database, token: EnrollmentTokenRow): void {
  db.insert(enrollmentTokens).values(token).run()
}

export function findEnrollmentToken(
  db: Database,
  tokenHash: string,
): EnrollmentTokenRow | undefined {
  return db.select().from(enrollmentTokens).where(eq(enrollmentTokens.tokenHash, tokenHash)).get()
}

export function findUsableEnrollmentToken(
  db: Database,
  tokenHash: string,
  nowIso: string,
): EnrollmentTokenRow | undefined {
  return db.select().from(enrollmentTokens).where(usableToken(tokenHash, nowIso)).get()
}

// A single conditional UPDATE keeps two concurrent consumes from both succeeding.
export function consumeEnrollmentToken(db: Database, tokenHash: string, nowIso: string): boolean {
  const result = db
    .update(enrollmentTokens)
    .set({ usedAt: nowIso })
    .where(usableToken(tokenHash, nowIso))
    .run()
  return result.changes === 1
}

export function deleteExpiredEnrollmentTokens(db: Database, nowIso: string): void {
  db.delete(enrollmentTokens).where(lte(enrollmentTokens.expiresAt, nowIso)).run()
}

function usableToken(tokenHash: string, nowIso: string) {
  return and(
    eq(enrollmentTokens.tokenHash, tokenHash),
    isNull(enrollmentTokens.usedAt),
    gt(enrollmentTokens.expiresAt, nowIso),
  )
}
