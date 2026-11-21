import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { type Database, openDatabase } from './connection.js'

describe('Given a database file path in a folder that does not exist yet', () => {
  const folder = mkdtempSync(join(tmpdir(), 'heavy-duty-connection-'))
  const databasePath = join(folder, 'nested', 'heavy-duty.sqlite')
  let db: Database | undefined

  afterEach(() => {
    db?.$client.close()
    rmSync(folder, { recursive: true, force: true })
  })

  describe('When the connection is opened', () => {
    it('Then should report journal_mode wal, foreign_keys on and busy_timeout 5000', () => {
      db = openDatabase(databasePath)

      expect({
        journalMode: db.$client.pragma('journal_mode', { simple: true }),
        foreignKeys: db.$client.pragma('foreign_keys', { simple: true }),
        busyTimeout: db.$client.pragma('busy_timeout', { simple: true }),
      }).toEqual({ journalMode: 'wal', foreignKeys: 1, busyTimeout: 5000 })
    })
  })
})
