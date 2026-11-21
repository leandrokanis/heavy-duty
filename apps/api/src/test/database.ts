import { type Database, openDatabase } from '../db/connection.js'
import { runMigrations } from '../db/migrate.js'

export function createTestDatabase(): Database {
  const db = openDatabase(':memory:')
  runMigrations(db)
  return db
}
