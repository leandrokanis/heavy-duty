import { spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import BetterSqlite3 from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { BackupConfig } from '../../../config/backup-env.js'
import { type Database, openDatabase } from '../../../db/connection.js'
import { createId } from '../../../db/id.js'
import { runMigrations } from '../../../db/migrate.js'
import { exercises } from '../../../db/schema.js'
import { runBackup } from './backup.job.js'
import { createResticStore } from './restic-store.js'
import { verifyDatabaseFile } from './verify.js'

const INSECURE_DEV_PASSWORD = 'insecure-dev-only-password'

// Runs only where the restic binary exists, such as the backup container (ADR-018).
const hasRestic = spawnSync('restic', ['version']).status === 0

function filesUnder(folder: string): string[] {
  return readdirSync(folder, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
}

function readExerciseNames(path: string): string[] {
  const restored = new BetterSqlite3(path, { readonly: true })
  try {
    const rows = restored.prepare('SELECT name FROM exercises').all() as { name: string }[]
    return rows.map((row) => row.name)
  } finally {
    restored.close()
  }
}

describe.skipIf(!hasRestic)(
  "Given a restic repository initialized in a temporary folder and a database with exercise 'Supino reto'",
  () => {
    let folder: string
    let repository: string
    let databasePath: string
    let db: Database
    let resticEnv: Record<string, string>

    beforeEach(() => {
      folder = mkdtempSync(join(tmpdir(), 'heavy-duty-restic-it-'))
      repository = join(folder, 'repository')
      resticEnv = {
        PATH: process.env.PATH ?? '',
        HOME: folder,
        RESTIC_REPOSITORY: repository,
        RESTIC_PASSWORD: INSECURE_DEV_PASSWORD,
      }
      const init = spawnSync('restic', ['init'], { env: resticEnv, encoding: 'utf8' })
      if (init.status !== 0) throw new Error(`restic init failed: ${init.stderr}`)
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

    describe('When runBackup sends the copy through the restic store and restic restores the latest snapshot', () => {
      it("Then the restored heavy-duty.sqlite should pass verifyDatabaseFile, contain 'Supino reto', and the repository files should not contain the text 'Supino reto'", async () => {
        const config: BackupConfig = {
          databasePath,
          resticRepository: repository,
          resticPassword: { kind: 'value', value: INSECURE_DEV_PASSWORD },
          resticBinary: 'restic',
          timeZone: 'America/Sao_Paulo',
          dailyAt: '03:00',
        }
        const store = createResticStore(config, { env: { PATH: resticEnv.PATH, HOME: folder } })

        const run = await runBackup({
          db,
          databasePath,
          store,
          now: () => new Date('2026-11-21T06:00:00.000Z'),
          trigger: 'manual',
          secrets: [INSECURE_DEV_PASSWORD],
        })
        const target = join(folder, 'restored')
        const restore = spawnSync('restic', ['restore', 'latest', '--target', target], {
          env: resticEnv,
          encoding: 'utf8',
        })
        const restoredPath = join(target, 'heavy-duty.sqlite')
        const plainText = Buffer.from('Supino reto')

        expect({
          runStatus: run.status,
          restoreStatus: restore.status,
          verification: verifyDatabaseFile(restoredPath).ok,
          names: readExerciseNames(restoredPath),
          repositoryLeaksText: filesUnder(repository).some((file) =>
            readFileSync(file).includes(plainText),
          ),
        }).toEqual({
          runStatus: 'succeeded',
          restoreStatus: 0,
          verification: true,
          names: ['Supino reto'],
          repositoryLeaksText: false,
        })
      })
    })
  },
)
