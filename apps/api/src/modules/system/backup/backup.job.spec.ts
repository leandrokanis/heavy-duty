import { copyFileSync, existsSync, mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import BetterSqlite3 from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { type Database, openDatabase } from '../../../db/connection.js'
import { createId } from '../../../db/id.js'
import { runMigrations } from '../../../db/migrate.js'
import { exercises } from '../../../db/schema.js'
import { listRecentBackupRuns } from '../backup-run.repository.js'
import { runBackup } from './backup.job.js'
import { OffsiteCopyError, type OffsiteStore } from './offsite-store.js'

type KeepingStore = OffsiteStore & { receivedPaths: string[] }

function createKeepingStore(keepPath: string): KeepingStore {
  const receivedPaths: string[] = []
  return {
    receivedPaths,
    async send(snapshotPath) {
      receivedPaths.push(snapshotPath)
      copyFileSync(snapshotPath, keepPath)
    },
  }
}

const INSECURE_DEV_PASSWORD = 'insecure-dev-only-password'

function createFailingStore(output: string): KeepingStore {
  const receivedPaths: string[] = []
  return {
    receivedPaths,
    async send(snapshotPath) {
      receivedPaths.push(snapshotPath)
      throw new OffsiteCopyError(output)
    },
  }
}

function createClock(...isoTimes: string[]): () => Date {
  let index = 0
  return () => new Date(isoTimes[Math.min(index++, isoTimes.length - 1)] as string)
}

function readExerciseNames(path: string): string[] {
  const copy = new BetterSqlite3(path, { readonly: true })
  try {
    const rows = copy.prepare('SELECT name FROM exercises').all() as { name: string }[]
    return rows.map((row) => row.name)
  } finally {
    copy.close()
  }
}

describe("Given a file database with exercise 'Supino reto'", () => {
  let folder: string
  let databasePath: string
  let db: Database

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), 'heavy-duty-job-'))
    databasePath = join(folder, 'heavy-duty.sqlite')
    db = openDatabase(databasePath)
    runMigrations(db)
    db.insert(exercises)
      .values({ id: createId(), slug: 'supino-reto', name: 'Supino reto', kind: 'reps' })
      .run()
  })

  afterEach(() => {
    db.$client.close()
    rmSync(folder, { recursive: true, force: true })
  })

  describe('and a fake offsite store that keeps the received file', () => {
    describe('When runBackup runs at a fixed clock', () => {
      it("Then the store should receive a copy that contains 'Supino reto', backup_runs should have one succeeded run with startedAt, finishedAt and the copy size, and the temporary folder should be gone", async () => {
        const keptPath = join(folder, 'kept.sqlite')
        const store = createKeepingStore(keptPath)

        await runBackup({
          db,
          databasePath,
          store,
          now: createClock('2026-11-21T06:00:00.000Z', '2026-11-21T06:00:03.000Z'),
          trigger: 'manual',
          secrets: [],
        })

        const receivedPath = store.receivedPaths[0] as string
        expect({
          names: readExerciseNames(keptPath),
          runs: listRecentBackupRuns(db, 10),
          temporaryFolderExists: existsSync(dirname(receivedPath)),
        }).toEqual({
          names: ['Supino reto'],
          runs: [
            {
              id: expect.any(String),
              startedAt: '2026-11-21T06:00:00.000Z',
              finishedAt: '2026-11-21T06:00:03.000Z',
              status: 'succeeded',
              sizeBytes: statSync(keptPath).size,
              error: null,
            },
          ],
          temporaryFolderExists: false,
        })
      })
    })
  })

  describe("and a fake offsite store that fails with 2000 characters of output ending in 'Fatal: wrong password' and containing the password and 'rest:https://user:secret@host/'", () => {
    describe('When runBackup runs', () => {
      it("Then backup_runs should have one failed run whose error starts with 'offsite copy failed', keeps the last line, has at most 500 characters, contains neither the password nor 'secret', and the temporary folder should be gone", async () => {
        const lastLine = `${'x'.repeat(1400)} rest:https://user:secret@host/ ${INSECURE_DEV_PASSWORD} Fatal: wrong password`
        const output = `${'restic noise\n'.repeat(40)}${lastLine}\n`
        const store = createFailingStore(output)

        await runBackup({
          db,
          databasePath,
          store,
          now: createClock('2026-11-21T06:00:00.000Z', '2026-11-21T06:00:02.000Z'),
          trigger: 'scheduled',
          secrets: [INSECURE_DEV_PASSWORD],
        })

        const [run] = listRecentBackupRuns(db, 10)
        const error = run?.error ?? ''
        expect({
          outputLength: output.length >= 2000,
          status: run?.status,
          startedAt: run?.startedAt,
          finishedAt: run?.finishedAt,
          sizeBytes: run?.sizeBytes,
          startsWithStage: error.startsWith('offsite copy failed'),
          keepsLastLine: error.endsWith('Fatal: wrong password'),
          withinLimit: error.length <= 500,
          leaksPassword: error.includes(INSECURE_DEV_PASSWORD),
          leaksCredential: error.includes('secret'),
          temporaryFolderExists: existsSync(dirname(store.receivedPaths[0] as string)),
        }).toEqual({
          outputLength: true,
          status: 'failed',
          startedAt: '2026-11-21T06:00:00.000Z',
          finishedAt: '2026-11-21T06:00:02.000Z',
          sizeBytes: null,
          startsWithStage: true,
          keepsLastLine: true,
          withinLimit: true,
          leaksPassword: false,
          leaksCredential: false,
          temporaryFolderExists: false,
        })
      })
    })
  })
})
