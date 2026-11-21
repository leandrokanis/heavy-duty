import type { Database } from '../../db/connection.js'
import { createId } from '../../db/id.js'
import { generateToken, hashToken } from './auth-token.js'
import {
  deleteExpiredSessions,
  deleteSessionByTokenHash,
  findSessionByTokenHash,
  insertSession,
  touchSession,
} from './session.repository.js'

export const SESSION_IDLE_MS = 30 * 24 * 60 * 60 * 1000
export const SESSION_RENEW_INTERVAL_MS = 24 * 60 * 60 * 1000

export type AuthSession = {
  id: string
  expiresAt: string
}

export type ValidatedSession = AuthSession & {
  renewed: boolean
}

export function createSession(db: Database, now: Date): AuthSession & { token: string } {
  const nowIso = now.toISOString()
  deleteExpiredSessions(db, nowIso)
  const token = generateToken()
  const session = {
    id: createId(now.getTime()),
    tokenHash: hashToken(token),
    createdAt: nowIso,
    expiresAt: expiresAfterIdle(now),
    lastSeenAt: nowIso,
  }
  insertSession(db, session)
  return { id: session.id, expiresAt: session.expiresAt, token }
}

export function validateSession(
  db: Database,
  token: string,
  now: Date,
): ValidatedSession | undefined {
  const session = findSessionByTokenHash(db, hashToken(token))
  if (!session || session.expiresAt <= now.toISOString()) {
    return undefined
  }
  const sinceLastSeenMs = now.getTime() - Date.parse(session.lastSeenAt)
  if (sinceLastSeenMs < SESSION_RENEW_INTERVAL_MS) {
    return { id: session.id, expiresAt: session.expiresAt, renewed: false }
  }
  const expiresAt = expiresAfterIdle(now)
  touchSession(db, session.id, { lastSeenAt: now.toISOString(), expiresAt })
  return { id: session.id, expiresAt, renewed: true }
}

export function endSession(db: Database, token: string): void {
  deleteSessionByTokenHash(db, hashToken(token))
}

function expiresAfterIdle(now: Date): string {
  return new Date(now.getTime() + SESSION_IDLE_MS).toISOString()
}
