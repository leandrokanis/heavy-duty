import { describe, expect, it } from 'vitest'
import { createId } from '../../db/id.js'
import { createTestDatabase } from '../../test/database.js'
import { generateToken, hashToken } from './auth-token.js'
import {
  consumeEnrollmentToken,
  findEnrollmentToken,
  insertEnrollmentToken,
} from './enrollment-token.repository.js'

const CREATED_AT = '2026-11-21T12:00:00.000Z'
const EXPIRES_AT = '2026-11-21T12:15:00.000Z'

function givenStoredToken() {
  const db = createTestDatabase()
  const tokenHash = hashToken(generateToken())
  insertEnrollmentToken(db, {
    id: createId(),
    tokenHash,
    createdAt: CREATED_AT,
    expiresAt: EXPIRES_AT,
    usedAt: null,
  })
  return { db, tokenHash }
}

describe('Given an enrollment token created at 12:00 that expires 15 minutes later', () => {
  describe('When it is consumed twice at 12:05', () => {
    it('Then the first consume should succeed, the second should fail, and used_at should be 12:05', () => {
      const { db, tokenHash } = givenStoredToken()
      const consumedAt = '2026-11-21T12:05:00.000Z'

      const results = [
        consumeEnrollmentToken(db, tokenHash, consumedAt),
        consumeEnrollmentToken(db, tokenHash, consumedAt),
      ]

      expect({ results, usedAt: findEnrollmentToken(db, tokenHash)?.usedAt }).toEqual({
        results: [true, false],
        usedAt: consumedAt,
      })
    })
  })

  describe('When it is consumed at 12:15:00.001', () => {
    it('Then should fail and used_at should stay null', () => {
      const { db, tokenHash } = givenStoredToken()

      const result = consumeEnrollmentToken(db, tokenHash, '2026-11-21T12:15:00.001Z')

      expect({ result, usedAt: findEnrollmentToken(db, tokenHash)?.usedAt }).toEqual({
        result: false,
        usedAt: null,
      })
    })
  })
})
