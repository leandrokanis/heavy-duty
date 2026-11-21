import { eq } from 'drizzle-orm'
import type { Database } from '../../db/connection.js'
import { authCredentials } from '../../db/schema.js'
import type { CredentialDescriptor, StoredCredential } from './webauthn.js'

export type AuthCredentialRow = typeof authCredentials.$inferSelect

export function insertCredential(db: Database, credential: AuthCredentialRow): void {
  db.insert(authCredentials).values(credential).run()
}

export function findCredentialByCredentialId(
  db: Database,
  credentialId: string,
): AuthCredentialRow | undefined {
  return db
    .select()
    .from(authCredentials)
    .where(eq(authCredentials.credentialId, credentialId))
    .get()
}

export function listCredentialIds(db: Database): string[] {
  return db
    .select({ credentialId: authCredentials.credentialId })
    .from(authCredentials)
    .all()
    .map((row) => row.credentialId)
}

export function listCredentialDescriptors(db: Database): CredentialDescriptor[] {
  return db
    .select({ credentialId: authCredentials.credentialId, transports: authCredentials.transports })
    .from(authCredentials)
    .all()
    .map((row) => ({ credentialId: row.credentialId, transports: parseTransports(row.transports) }))
}

export function updateCredentialUse(
  db: Database,
  id: string,
  use: { counter: number; lastUsedAt: string },
): void {
  db.update(authCredentials).set(use).where(eq(authCredentials.id, id)).run()
}

export function toStoredCredential(row: AuthCredentialRow): StoredCredential {
  return {
    credentialId: row.credentialId,
    publicKey: new Uint8Array(row.publicKey),
    counter: row.counter,
    transports: parseTransports(row.transports),
  }
}

function parseTransports(value: string | null): string[] | undefined {
  return value === null ? undefined : (JSON.parse(value) as string[])
}
