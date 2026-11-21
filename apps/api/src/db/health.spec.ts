import { describe, expect, it, vi } from 'vitest'
import { createTestDatabase } from '../test/database.js'
import { createDatabaseHealthProbe } from './health.js'

describe('Given a closed database connection', () => {
  const db = createTestDatabase()
  const probe = createDatabaseHealthProbe(db)
  db.$client.close()

  describe('When the probe runs', () => {
    it('Then should report the database down', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(probe()).toBe(false)
    })
  })
})

describe('Given an open migrated database', () => {
  const db = createTestDatabase()
  const probe = createDatabaseHealthProbe(db)

  describe('When the probe runs', () => {
    it('Then should report the database up', () => {
      expect(probe()).toBe(true)
    })
  })
})
