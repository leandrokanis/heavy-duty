import { randomBytes } from 'node:crypto'
import {
  closeSync,
  mkdtempSync,
  openSync,
  rmSync,
  statSync,
  writeFileSync,
  writeSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase } from '../../../db/connection.js'
import { createId } from '../../../db/id.js'
import { runMigrations } from '../../../db/migrate.js'
import { exercises } from '../../../db/schema.js'
import { createSnapshot } from './sqlite-snapshot.js'
import { verifyDatabaseFile } from './verify.js'

describe('Given a folder for database files', () => {
  let folder: string

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), 'heavy-duty-verify-'))
  })

  afterEach(() => {
    rmSync(folder, { recursive: true, force: true })
  })

  describe('When a valid snapshot is verified', () => {
    it('Then should report ok with the table list including backup_runs', () => {
      const databasePath = join(folder, 'heavy-duty.sqlite')
      const db = openDatabase(databasePath)
      runMigrations(db)
      db.$client.close()
      const snapshot = createSnapshot(databasePath, join(folder, 'restored.sqlite'))

      const result = verifyDatabaseFile(snapshot.path)

      expect(result).toEqual({ ok: true, tables: expect.arrayContaining(['backup_runs']) })
    })
  })

  describe('When a file with random bytes is verified', () => {
    it('Then should report not ok', () => {
      const path = join(folder, 'random.sqlite')
      writeFileSync(path, randomBytes(8192))

      expect(verifyDatabaseFile(path)).toEqual({ ok: false, reason: expect.any(String) })
    })
  })

  describe('When a snapshot whose last page was overwritten is verified', () => {
    it('Then should report not ok, although the table list still opens', () => {
      const databasePath = join(folder, 'heavy-duty.sqlite')
      const db = openDatabase(databasePath)
      runMigrations(db)
      for (let index = 0; index < 200; index++) {
        db.insert(exercises)
          .values({
            id: createId(),
            slug: `exercise-${index}`,
            name: `Exercise ${index}`,
            kind: 'reps',
          })
          .run()
      }
      db.$client.close()
      const snapshot = createSnapshot(databasePath, join(folder, 'corrupted.sqlite'))
      const pageSize = 4096
      const lastPageOffset = statSync(snapshot.path).size - pageSize
      const file = openSync(snapshot.path, 'r+')
      writeSync(file, Buffer.alloc(pageSize, 0x5a), 0, pageSize, lastPageOffset)
      closeSync(file)

      expect(verifyDatabaseFile(snapshot.path)).toEqual({
        ok: false,
        reason: expect.stringContaining('integrity_check'),
      })
    })
  })
})
