import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Database } from '../../../db/connection.js'
import { createId } from '../../../db/id.js'
import { type BackupRunRow, insertBackupRun } from '../backup-run.repository.js'
import { type BackupStage, toFailureReason } from './failure-reason.js'
import { type BackupTrigger, OffsiteCopyError, type OffsiteStore } from './offsite-store.js'
import { createSnapshot, type Snapshot } from './sqlite-snapshot.js'

export type BackupJobDeps = {
  db: Database
  databasePath: string
  store: OffsiteStore
  now: () => Date
  trigger: BackupTrigger
  secrets: readonly string[]
}

const SNAPSHOT_FILE_NAME = 'heavy-duty.sqlite'

type CopyOutcome = { snapshot: Snapshot } | { stage: BackupStage; detail: string }

// Records every run, failed or not; only a failed insert escapes as an error.
export async function runBackup(deps: BackupJobDeps): Promise<BackupRunRow> {
  const startedAt = deps.now()
  const outcome = await copyOffsite(deps)
  const finishedAt = deps.now()
  const run: BackupRunRow = {
    id: createId(startedAt.getTime()),
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    ...('snapshot' in outcome
      ? { status: 'succeeded', sizeBytes: outcome.snapshot.sizeBytes, error: null }
      : {
          status: 'failed',
          sizeBytes: null,
          error: toFailureReason(outcome.stage, outcome.detail, deps.secrets),
        }),
  }
  insertBackupRun(deps.db, run)
  return run
}

async function copyOffsite(deps: BackupJobDeps): Promise<CopyOutcome> {
  const folder = mkdtempSync(join(tmpdir(), 'heavy-duty-backup-'))
  try {
    let snapshot: Snapshot
    try {
      snapshot = createSnapshot(deps.databasePath, join(folder, SNAPSHOT_FILE_NAME))
    } catch (error) {
      return { stage: 'snapshot failed', detail: errorDetail(error) }
    }
    try {
      await deps.store.send(snapshot.path, deps.trigger)
    } catch (error) {
      return { stage: 'offsite copy failed', detail: errorDetail(error) }
    }
    return { snapshot }
  } finally {
    rmSync(folder, { recursive: true, force: true })
  }
}

function errorDetail(error: unknown): string {
  if (error instanceof OffsiteCopyError) return error.detail
  return error instanceof Error ? error.message : String(error)
}
