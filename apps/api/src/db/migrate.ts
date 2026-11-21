import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import type { Database } from './connection.js'
import { isEntryPoint, runDatabaseScript } from './script.js'

// Resolves to apps/api/src/db/migrations from both src/db and dist/db.
const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../src/db/migrations', import.meta.url))

export function runMigrations(db: Database): void {
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })
}

if (isEntryPoint(import.meta.url)) {
  runDatabaseScript('db:migrate', runMigrations)
}
