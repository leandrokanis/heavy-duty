import { eq, isNull, lte } from 'drizzle-orm'
import type { Database } from '../../db/connection.js'
import { oauthAuthorizationCodes, oauthGrants } from '../../db/schema.js'

export type OAuthGrantRow = typeof oauthGrants.$inferSelect

export function insertGrant(db: Database, grant: OAuthGrantRow): void {
  db.insert(oauthGrants).values(grant).run()
}

export function findGrantByAccessTokenHash(
  db: Database,
  accessTokenHash: string,
): OAuthGrantRow | undefined {
  return db.select().from(oauthGrants).where(eq(oauthGrants.accessTokenHash, accessTokenHash)).get()
}

export function findGrantByRefreshTokenHash(
  db: Database,
  refreshTokenHash: string,
): OAuthGrantRow | undefined {
  return db
    .select()
    .from(oauthGrants)
    .where(eq(oauthGrants.refreshTokenHash, refreshTokenHash))
    .get()
}

export function findGrantByPreviousRefreshTokenHash(
  db: Database,
  refreshTokenHash: string,
): OAuthGrantRow | undefined {
  return db
    .select()
    .from(oauthGrants)
    .where(eq(oauthGrants.previousRefreshTokenHash, refreshTokenHash))
    .get()
}

export function rotateGrant(
  db: Database,
  id: string,
  tokens: Pick<
    OAuthGrantRow,
    | 'accessTokenHash'
    | 'accessExpiresAt'
    | 'refreshTokenHash'
    | 'previousRefreshTokenHash'
    | 'refreshExpiresAt'
  >,
): void {
  db.update(oauthGrants).set(tokens).where(eq(oauthGrants.id, id)).run()
}

export function revokeGrant(db: Database, id: string, revokedAt: string): void {
  db.update(oauthGrants).set({ revokedAt }).where(eq(oauthGrants.id, id)).run()
}

export function deleteExpiredGrantsAndCodes(db: Database, nowIso: string): void {
  db.delete(oauthAuthorizationCodes).where(lte(oauthAuthorizationCodes.expiresAt, nowIso)).run()
  db.delete(oauthGrants).where(lte(oauthGrants.refreshExpiresAt, nowIso)).run()
}

export function revokeActiveGrants(db: Database, revokedAt: string): number {
  return db.update(oauthGrants).set({ revokedAt }).where(isNull(oauthGrants.revokedAt)).run()
    .changes
}
