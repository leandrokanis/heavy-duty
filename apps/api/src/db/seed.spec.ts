import { describe, expect, it } from 'vitest'
import { createTestDatabase } from '../test/database.js'
import { settings } from './schema.js'
import { runSeed } from './seed.js'

describe('Given a migrated in-memory database', () => {
  const db = createTestDatabase()

  describe('When the seed runs twice', () => {
    it('Then should keep the settings table empty', () => {
      runSeed(db)
      runSeed(db)

      expect(db.select().from(settings).all()).toEqual([])
    })
  })
})
