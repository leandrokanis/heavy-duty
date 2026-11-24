import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import type { Database } from '../db/connection.js'

const MIGRATIONS_FOLDER = fileURLToPath(new URL('../db/migrations', import.meta.url))

// Applies a copy of the migrations that stops right before the given index, so a test can store
// the rows a later migration fills. Returns the folder of the copy, for the test to remove.
export function migrateBefore(db: Database, index: number): string {
  const folder = mkdtempSync(join(tmpdir(), 'heavy-duty-migrations-'))
  cpSync(MIGRATIONS_FOLDER, folder, { recursive: true })
  const journalPath = join(folder, 'meta', '_journal.json')
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as { entries: { idx: number }[] }
  journal.entries = journal.entries.filter(({ idx }) => idx < index)
  writeFileSync(journalPath, JSON.stringify(journal))
  migrate(db, { migrationsFolder: folder })
  return folder
}
