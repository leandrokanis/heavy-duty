import { existsSync } from 'node:fs'
import { type BackupConfig, loadBackupConfig } from '../../../config/backup-env.js'
import type { Environment } from '../../../config/env.js'
import { openDatabase } from '../../../db/connection.js'
import { isEntryPoint } from '../../../db/script.js'
import { runBackup } from './backup.job.js'
import { toFailureReason } from './failure-reason.js'
import type { OffsiteStore } from './offsite-store.js'
import { createResticStore } from './restic-store.js'

export type BackupLog = {
  info: (...parts: unknown[]) => void
  error: (...parts: unknown[]) => void
}

export type BackupCommandDeps = {
  createStore: (config: BackupConfig) => OffsiteStore
  now: () => Date
  log: BackupLog
}

const COMMAND = 'backup:run'

export async function runBackupCommand(env: Environment, deps: BackupCommandDeps): Promise<number> {
  let secrets: string[] = []
  try {
    const config = loadBackupConfig(env)
    secrets = backupSecrets(config)
    return await runRecordedBackup(config, deps)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    deps.log.error(`${COMMAND}: ${toFailureReason('run not recorded', detail, secrets)}`)
    return 1
  }
}

async function runRecordedBackup(config: BackupConfig, deps: BackupCommandDeps): Promise<number> {
  // openDatabase would create an empty database at a wrong path.
  if (!existsSync(config.databasePath)) {
    throw new Error('database file not found at DATABASE_PATH')
  }
  const db = openDatabase(config.databasePath)
  try {
    const run = await runBackup({
      db,
      databasePath: config.databasePath,
      store: deps.createStore(config),
      now: deps.now,
      trigger: 'manual',
      secrets: backupSecrets(config),
    })
    if (run.status === 'succeeded') {
      deps.log.info(`${COMMAND}: succeeded (${run.sizeBytes} bytes)`)
      return 0
    }
    deps.log.error(`${COMMAND}: failed: ${run.error}`)
    return 1
  } finally {
    db.$client.close()
  }
}

export function backupSecrets(config: BackupConfig): string[] {
  return config.resticPassword.kind === 'value' ? [config.resticPassword.value] : []
}

if (isEntryPoint(import.meta.url)) {
  const exitCode = await runBackupCommand(process.env, {
    createStore: (config) => createResticStore(config),
    now: () => new Date(),
    log: console,
  })
  process.exitCode = exitCode
}
