import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase } from '../../../db/connection.js'
import { runMigrations } from '../../../db/migrate.js'
import { listRecentBackupRuns } from '../backup-run.repository.js'
import { OffsiteCopyError, type OffsiteStore } from './offsite-store.js'
import { type BackupCommandDeps, runBackupCommand } from './run.js'

const INSECURE_DEV_PASSWORD = 'insecure-dev-only-password'

type CapturedLog = { lines: string[]; log: BackupCommandDeps['log'] }

function captureLog(): CapturedLog {
  const lines: string[] = []
  const push = (...parts: unknown[]) => lines.push(parts.map(String).join(' '))
  return { lines, log: { info: push, error: push } }
}

const succeedingStore: OffsiteStore = { send: async () => {} }

function failingStore(output: string): OffsiteStore {
  return {
    send: async () => {
      throw new OffsiteCopyError(output)
    },
  }
}

function sameDayClock(): () => Date {
  let seconds = 0
  return () => new Date(Date.UTC(2026, 10, 21, 12, 0, seconds++))
}

describe('Given a migrated file database and the backup environment', () => {
  let folder: string
  let databasePath: string
  let env: Record<string, string>

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), 'heavy-duty-run-'))
    databasePath = join(folder, 'heavy-duty.sqlite')
    const db = openDatabase(databasePath)
    runMigrations(db)
    db.$client.close()
    env = {
      NODE_ENV: 'development',
      DATABASE_PATH: databasePath,
      RESTIC_REPOSITORY: join(folder, 'restic'),
      RESTIC_PASSWORD: INSECURE_DEV_PASSWORD,
    }
  })

  afterEach(() => {
    rmSync(folder, { recursive: true, force: true })
  })

  function recordedStatuses(): string[] {
    const db = openDatabase(databasePath)
    try {
      return listRecentBackupRuns(db, 10).map((run) => run.status)
    } finally {
      db.$client.close()
    }
  }

  describe('and a fake store that succeeds', () => {
    describe('When the command runs twice on the same day', () => {
      it('Then should return 0 both times and record two succeeded runs', async () => {
        const deps = { createStore: () => succeedingStore, now: sameDayClock(), ...captureLog() }

        const exitCodes = [await runBackupCommand(env, deps), await runBackupCommand(env, deps)]

        expect({ exitCodes, statuses: recordedStatuses() }).toEqual({
          exitCodes: [0, 0],
          statuses: ['succeeded', 'succeeded'],
        })
      })
    })
  })

  describe('and a fake store that fails with the password in its output', () => {
    describe('When the command runs', () => {
      it('Then should return 1 and log the reason without the password', async () => {
        const { lines, log } = captureLog()
        const store = failingStore(
          `Fatal: wrong password ${INSECURE_DEV_PASSWORD} for rest:https://user:secret@host/`,
        )

        const exitCode = await runBackupCommand(env, {
          createStore: () => store,
          now: sameDayClock(),
          log,
        })

        const output = lines.join('\n')
        expect({
          exitCode,
          logsReason: output.includes('offsite copy failed: Fatal: wrong password'),
          leaksPassword: output.includes(INSECURE_DEV_PASSWORD),
          leaksCredential: output.includes('secret'),
        }).toEqual({ exitCode: 1, logsReason: true, leaksPassword: false, leaksCredential: false })
      })
    })
  })
})

describe('Given a database file without migrations', () => {
  let folder: string
  let databasePath: string

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), 'heavy-duty-run-'))
    databasePath = join(folder, 'heavy-duty.sqlite')
    openDatabase(databasePath).$client.close()
  })

  afterEach(() => {
    rmSync(folder, { recursive: true, force: true })
  })

  describe('When the command runs', () => {
    it('Then should return 1, log a reason that mentions backup_runs, and leave the database without the table', async () => {
      const { lines, log } = captureLog()
      const env = {
        NODE_ENV: 'development',
        DATABASE_PATH: databasePath,
        RESTIC_REPOSITORY: join(folder, 'restic'),
        RESTIC_PASSWORD: INSECURE_DEV_PASSWORD,
      }

      const exitCode = await runBackupCommand(env, {
        createStore: () => succeedingStore,
        now: sameDayClock(),
        log,
      })

      const db = openDatabase(databasePath)
      const tables = db.$client
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'backup_runs'")
        .all()
      db.$client.close()
      expect({
        exitCode,
        mentionsTable: lines.join('\n').includes('backup_runs'),
        tables,
      }).toEqual({ exitCode: 1, mentionsTable: true, tables: [] })
    })
  })
})

describe('Given DATABASE_PATH pointing to a file that does not exist', () => {
  let folder: string

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), 'heavy-duty-run-'))
  })

  afterEach(() => {
    rmSync(folder, { recursive: true, force: true })
  })

  describe('When the command runs', () => {
    it('Then should return 1 without creating the database file or calling the store', async () => {
      const databasePath = join(folder, 'missing.sqlite')
      const sent: string[] = []
      const env = {
        NODE_ENV: 'development',
        DATABASE_PATH: databasePath,
        RESTIC_REPOSITORY: join(folder, 'restic'),
        RESTIC_PASSWORD: INSECURE_DEV_PASSWORD,
      }

      const exitCode = await runBackupCommand(env, {
        createStore: () => ({ send: async (path) => void sent.push(path) }),
        now: sameDayClock(),
        ...captureLog(),
      })

      expect({ exitCode, created: existsSync(databasePath), sent }).toEqual({
        exitCode: 1,
        created: false,
        sent: [],
      })
    })
  })
})
