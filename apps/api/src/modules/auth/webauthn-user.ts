import { randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import type { Database } from '../../db/connection.js'
import { settings } from '../../db/schema.js'

const WEBAUTHN_USER_ID_KEY = 'webauthn_user_id'
const USER_ID_BYTES = 16

// A stable user handle lets the phone replace an old passkey when the athlete enrolls again.
export function getOrCreateWebAuthnUserId(db: Database, now: Date): Uint8Array {
  db.insert(settings)
    .values({
      key: WEBAUTHN_USER_ID_KEY,
      value: randomBytes(USER_ID_BYTES).toString('base64url'),
      updatedAt: now.toISOString(),
    })
    .onConflictDoNothing()
    .run()
  const row = db.select().from(settings).where(eq(settings.key, WEBAUTHN_USER_ID_KEY)).get()
  if (!row) {
    throw new Error('webauthn_user_id is missing from settings')
  }
  return new Uint8Array(Buffer.from(row.value, 'base64url'))
}
