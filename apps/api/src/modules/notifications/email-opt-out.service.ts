import { createHash, randomBytes } from 'node:crypto'
import type { Database } from '../../db/connection.js'
import { setEmailNotices } from './email-settings.service.js'
import { hasEmailWithUnsubscribeTokenHash } from './notification.repository.js'

const UNSUBSCRIBE_TOKEN_BYTES = 32
// 32 bytes in base64url take 43 characters; a longer value is never looked up.
export const MAX_UNSUBSCRIBE_TOKEN_LENGTH = 64

export function createUnsubscribeToken(): string {
  return randomBytes(UNSUBSCRIBE_TOKEN_BYTES).toString('base64url')
}

// The database keeps only this hash; the token itself exists only in the email (ADR-037).
export function unsubscribeTokenHashOf(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// Answers nothing on purpose: a valid and an unknown token look the same from outside (ADR-037).
export function turnEmailsOffByToken(db: Database, token: string | undefined, now: Date): void {
  if (token === undefined || token.length === 0 || token.length > MAX_UNSUBSCRIBE_TOKEN_LENGTH) {
    return
  }
  if (!hasEmailWithUnsubscribeTokenHash(db, unsubscribeTokenHashOf(token))) return
  setEmailNotices(db, { enabled: false }, now)
}
