import { afterEach, describe, expect, it } from 'vitest'
import { type Database, openDatabase } from './connection.js'
import { runMigrations } from './migrate.js'

describe('Given an in-memory database', () => {
  let db: Database | undefined

  afterEach(() => {
    db?.$client.close()
  })

  describe('When the migrations run twice', () => {
    it('Then should have an empty settings table and no error', () => {
      db = openDatabase(':memory:')

      runMigrations(db)
      runMigrations(db)

      const columns = db.$client
        .prepare<[string], { name: string }>('SELECT name FROM pragma_table_info(?)')
        .all('settings')
        .map((column) => column.name)
      const counted = db.$client
        .prepare<[], { rowCount: number }>('SELECT count(*) AS rowCount FROM settings')
        .get()

      expect({ columns, rowCount: counted?.rowCount }).toEqual({
        columns: ['key', 'value', 'updated_at'],
        rowCount: 0,
      })
    })
  })
})
