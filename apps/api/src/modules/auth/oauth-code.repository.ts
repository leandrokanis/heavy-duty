import { and, eq, gt, isNull } from 'drizzle-orm'
import type { Database } from '../../db/connection.js'
import { oauthAuthorizationCodes } from '../../db/schema.js'

export type OAuthCodeRow = typeof oauthAuthorizationCodes.$inferSelect

export function insertCode(db: Database, code: OAuthCodeRow): void {
  db.insert(oauthAuthorizationCodes).values(code).run()
}

// Atomic: of two concurrent exchanges of the same code, only one gets the row back.
export function consumeCode(
  db: Database,
  codeHash: string,
  nowIso: string,
): OAuthCodeRow | undefined {
  return db
    .update(oauthAuthorizationCodes)
    .set({ usedAt: nowIso })
    .where(
      and(
        eq(oauthAuthorizationCodes.codeHash, codeHash),
        isNull(oauthAuthorizationCodes.usedAt),
        gt(oauthAuthorizationCodes.expiresAt, nowIso),
      ),
    )
    .returning()
    .get()
}

export function spendPendingCodes(db: Database, usedAt: string): number {
  return db
    .update(oauthAuthorizationCodes)
    .set({ usedAt })
    .where(isNull(oauthAuthorizationCodes.usedAt))
    .run().changes
}
