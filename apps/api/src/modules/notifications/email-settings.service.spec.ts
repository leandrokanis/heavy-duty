import { describe, expect, it } from 'vitest'
import { createTestDatabase } from '../../test/database.js'
import { isEmailEnabled, setEmailNotices } from './email-settings.service.js'

const NOW = new Date('2026-11-25T12:00:00.000Z')

describe('Given a database where the emails were never set', () => {
  describe('When the email setting is read', () => {
    it('Then the emails should be on', () => {
      expect(isEmailEnabled(createTestDatabase())).toBe(true)
    })
  })
})

describe('Given the emails on', () => {
  describe('When setEmailNotices turns them off', () => {
    it('Then should return the setting with the clock of the API', () => {
      const db = createTestDatabase()

      expect(setEmailNotices(db, { enabled: false }, NOW)).toEqual({
        emailEnabled: false,
        updatedAt: '2026-11-25T12:00:00.000Z',
      })
    })

    it('Then the emails should be off', () => {
      const db = createTestDatabase()
      setEmailNotices(db, { enabled: false }, NOW)

      expect(isEmailEnabled(db)).toBe(false)
    })

    describe('and setEmailNotices turns them on again', () => {
      it('Then the emails should be on', () => {
        const db = createTestDatabase()
        setEmailNotices(db, { enabled: false }, NOW)
        setEmailNotices(db, { enabled: true }, new Date('2026-11-26T12:00:00.000Z'))

        expect(isEmailEnabled(db)).toBe(true)
      })
    })
  })
})
