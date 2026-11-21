import { statSync } from 'node:fs'
import BetterSqlite3 from 'better-sqlite3'

export type Snapshot = { path: string; sizeBytes: number }

const BUSY_TIMEOUT_MS = 5000

// VACUUM INTO reads one point in time and, in WAL mode, does not block the API, see ADR-018.
export function createSnapshot(databasePath: string, targetPath: string): Snapshot {
  const source = new BetterSqlite3(databasePath, { fileMustExist: true })
  try {
    source.pragma(`busy_timeout = ${BUSY_TIMEOUT_MS}`)
    source.prepare('VACUUM INTO ?').run(targetPath)
  } finally {
    source.close()
  }
  return { path: targetPath, sizeBytes: statSync(targetPath).size }
}
