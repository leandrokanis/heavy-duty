import { describe, expect, it } from 'vitest'
import { createTestDatabase } from '../../test/database.js'
import { hashToken } from './auth-token.js'
import { findSessionByTokenHash } from './session.repository.js'
import { createSession, endSession, validateSession } from './session.service.js'

const T0 = new Date('2026-11-21T12:00:00.000Z')
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

function at(offsetMs: number): Date {
  return new Date(T0.getTime() + offsetMs)
}

describe('Given a session created at T0', () => {
  describe('When it is validated at T0 + 30 days + 1 ms', () => {
    it('Then should be invalid', () => {
      const db = createTestDatabase()
      const { token } = createSession(db, T0)

      expect(validateSession(db, token, at(30 * DAY_MS + 1))).toBeUndefined()
    })
  })
})

describe('Given a session created at T0 and validated 12 hours later', () => {
  describe('When the stored session is read back', () => {
    it('Then should be valid and keep lastSeenAt and expiresAt unchanged', () => {
      const db = createTestDatabase()
      const { token } = createSession(db, T0)

      const validated = validateSession(db, token, at(12 * HOUR_MS))
      const stored = findSessionByTokenHash(db, hashToken(token))

      expect({ validated, lastSeenAt: stored?.lastSeenAt, expiresAt: stored?.expiresAt }).toEqual({
        validated: {
          id: expect.any(String),
          expiresAt: at(30 * DAY_MS).toISOString(),
          renewed: false,
        },
        lastSeenAt: T0.toISOString(),
        expiresAt: at(30 * DAY_MS).toISOString(),
      })
    })
  })
})

describe('Given a session created at T0 and validated 25 hours later', () => {
  describe('When the stored session is read back', () => {
    it('Then should be valid and renewed to expire 30 days after T0 + 25 hours', () => {
      const db = createTestDatabase()
      const { token } = createSession(db, T0)
      const renewedAt = at(25 * HOUR_MS)
      const expectedExpiresAt = new Date(renewedAt.getTime() + 30 * DAY_MS).toISOString()

      const validated = validateSession(db, token, renewedAt)
      const stored = findSessionByTokenHash(db, hashToken(token))

      expect({ validated, lastSeenAt: stored?.lastSeenAt, expiresAt: stored?.expiresAt }).toEqual({
        validated: { id: expect.any(String), expiresAt: expectedExpiresAt, renewed: true },
        lastSeenAt: renewedAt.toISOString(),
        expiresAt: expectedExpiresAt,
      })
    })
  })
})

describe('Given a created session', () => {
  describe('When the database file is searched for the token', () => {
    it('Then should store only the hash, never the token in plain text', () => {
      const db = createTestDatabase()
      const { token } = createSession(db, T0)

      const rows = db.$client.prepare('SELECT * FROM auth_sessions').all()

      expect({
        storesHash: findSessionByTokenHash(db, hashToken(token)) !== undefined,
        containsToken: JSON.stringify(rows).includes(token),
      }).toEqual({ storesHash: true, containsToken: false })
    })
  })
})

describe('Given an unknown token', () => {
  describe('When it is validated', () => {
    it('Then should be invalid', () => {
      const db = createTestDatabase()
      createSession(db, T0)

      expect(validateSession(db, 'forged-token', T0)).toBeUndefined()
    })
  })
})

describe('Given a session that expired 30 days after T0', () => {
  describe('When a new session is created at T0 + 31 days', () => {
    it('Then should delete the expired session', () => {
      const db = createTestDatabase()
      const expired = createSession(db, T0)

      createSession(db, at(31 * DAY_MS))

      expect(findSessionByTokenHash(db, hashToken(expired.token))).toBeUndefined()
    })
  })
})

describe('Given a session ended with endSession', () => {
  describe('When the old token is validated', () => {
    it('Then should be invalid', () => {
      const db = createTestDatabase()
      const { token } = createSession(db, T0)

      endSession(db, token)

      expect(validateSession(db, token, at(HOUR_MS))).toBeUndefined()
    })
  })
})
