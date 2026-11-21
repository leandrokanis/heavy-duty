import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import BetterSqlite3 from 'better-sqlite3'
import { type BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema.js'

export type Database = BetterSQLite3Database<typeof schema> & { $client: BetterSqlite3.Database }

const BUSY_TIMEOUT_MS = 5000

export function openDatabase(databasePath: string): Database {
  mkdirSync(dirname(databasePath), { recursive: true })

  const sqlite = new BetterSqlite3(databasePath)
  // WAL lets the backup copy a live database, see ADR-005.
  sqlite.pragma('journal_mode = WAL')
  // Explicit although better-sqlite3 defaults agree, so a driver change keeps them.
  sqlite.pragma('foreign_keys = ON')
  sqlite.pragma(`busy_timeout = ${BUSY_TIMEOUT_MS}`)

  return drizzle(sqlite, { schema })
}
