import { mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import BetterSqlite3 from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { type Database, openDatabase } from '../../../db/connection.js'
import { createId } from '../../../db/id.js'
import { runMigrations } from '../../../db/migrate.js'
import { exercises } from '../../../db/schema.js'
import { createSnapshot } from './sqlite-snapshot.js'

function insertExercise(db: Database, name: string): void {
  db.insert(exercises)
    .values({ id: createId(), slug: name.toLowerCase().replace(' ', '-'), name, kind: 'reps' })
    .run()
}

function readExerciseNames(path: string): string[] {
  const snapshot = new BetterSqlite3(path, { readonly: true })
  try {
    const rows = snapshot.prepare('SELECT name FROM exercises ORDER BY name').all() as {
      name: string
    }[]
    return rows.map((row) => row.name)
  } finally {
    snapshot.close()
  }
}

function integrityCheck(path: string): string {
  const snapshot = new BetterSqlite3(path, { readonly: true })
  try {
    return snapshot.pragma('integrity_check', { simple: true }) as string
  } finally {
    snapshot.close()
  }
}

describe("Given a file database with exercise 'Supino reto' committed and a second connection holding an uncommitted insert of 'Prancha'", () => {
  let folder: string
  let api: Database
  let writer: Database

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), 'heavy-duty-snapshot-'))
    const databasePath = join(folder, 'heavy-duty.sqlite')
    api = openDatabase(databasePath)
    runMigrations(api)
    insertExercise(api, 'Supino reto')
    writer = openDatabase(databasePath)
    writer.$client.exec('BEGIN IMMEDIATE')
    insertExercise(writer, 'Prancha')
  })

  afterEach(() => {
    if (writer.$client.inTransaction) writer.$client.exec('ROLLBACK')
    writer.$client.close()
    api.$client.close()
    rmSync(folder, { recursive: true, force: true })
  })

  describe('When a snapshot is created', () => {
    it("Then the snapshot should pass integrity_check, contain 'Supino reto' and not 'Prancha', report its size in bytes, and the second connection should commit without error", () => {
      // The apostrophe proves the target path is bound, not interpolated into SQL.
      const targetPath = join(folder, "it's-a-snapshot.sqlite")

      const snapshot = createSnapshot(join(folder, 'heavy-duty.sqlite'), targetPath)
      writer.$client.exec('COMMIT')

      expect({
        integrity: integrityCheck(targetPath),
        names: readExerciseNames(targetPath),
        sizeBytes: snapshot.sizeBytes,
        writerCommitted: readExerciseNames(join(folder, 'heavy-duty.sqlite')),
      }).toEqual({
        integrity: 'ok',
        names: ['Supino reto'],
        sizeBytes: statSync(targetPath).size,
        writerCommitted: ['Prancha', 'Supino reto'],
      })
    })
  })
})
