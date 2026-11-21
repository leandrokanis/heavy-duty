import BetterSqlite3 from 'better-sqlite3'
import { isEntryPoint } from '../../../db/script.js'

export type DatabaseVerification = { ok: true; tables: string[] } | { ok: false; reason: string }

export function verifyDatabaseFile(path: string): DatabaseVerification {
  let database: BetterSqlite3.Database | undefined
  try {
    database = new BetterSqlite3(path, { readonly: true, fileMustExist: true })
    const integrity = database.pragma('integrity_check', { simple: true })
    if (integrity !== 'ok') return { ok: false, reason: `integrity_check: ${String(integrity)}` }
    const rows = database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as { name: string }[]
    return { ok: true, tables: rows.map((row) => row.name) }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  } finally {
    database?.close()
  }
}

if (isEntryPoint(import.meta.url)) {
  const path = process.argv[2]
  if (!path) {
    console.error('backup:verify: usage: pnpm --filter @heavy-duty/api backup:verify <file>')
    process.exitCode = 1
  } else {
    const result = verifyDatabaseFile(path)
    if (result.ok) {
      console.log(`backup:verify: ok (${result.tables.length} tables: ${result.tables.join(', ')})`)
    } else {
      console.error(`backup:verify: not ok: ${result.reason}`)
      process.exitCode = 1
    }
  }
}
