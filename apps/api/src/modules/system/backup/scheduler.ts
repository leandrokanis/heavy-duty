import { existsSync } from 'node:fs'
import { type BackupConfig, loadBackupConfig } from '../../../config/backup-env.js'
import { type Database, openDatabase } from '../../../db/connection.js'
import { isEntryPoint } from '../../../db/script.js'
import { findLatestBackupRunStartedAt } from '../backup-run.repository.js'
import { runBackup } from './backup.job.js'
import { toFailureReason } from './failure-reason.js'
import type { BackupTrigger, OffsiteStore } from './offsite-store.js'
import { createResticStore } from './restic-store.js'
import { type BackupLog, backupSecrets } from './run.js'
import { type BackupSchedule, isBackupDue } from './schedule.js'

export const SCHEDULER_INTERVAL_MS = 60_000

const COMMAND = 'backup:scheduler'

export type SchedulerState = { lastAttemptAt?: Date }

export type SchedulerTickDeps = {
  db: Database
  schedule: BackupSchedule
  now: () => Date
  runJob: (trigger: BackupTrigger) => Promise<unknown>
  log: BackupLog
  secrets?: readonly string[]
}

export async function runSchedulerTick(
  state: SchedulerState,
  deps: SchedulerTickDeps,
): Promise<SchedulerState> {
  const now = deps.now()
  const lastStartedAt = latest(state.lastAttemptAt, findLatestBackupRunStartedAt(deps.db))
  if (!isBackupDue(now, lastStartedAt, deps.schedule)) return state
  try {
    await deps.runJob('scheduled')
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    deps.log.error(`${COMMAND}: ${toFailureReason('run not recorded', detail, deps.secrets ?? [])}`)
  }
  return { lastAttemptAt: now }
}

function latest(attempt: Date | undefined, recorded: string | undefined): Date | undefined {
  const recordedAt = recorded === undefined ? undefined : new Date(recorded)
  if (!attempt) return recordedAt
  if (!recordedAt) return attempt
  return attempt > recordedAt ? attempt : recordedAt
}

export type SchedulerLoopDeps = {
  store: OffsiteStore
  now: () => Date
  log: BackupLog
  intervalMs?: number
}

export type RunningScheduler = { stop: () => Promise<void> }

// Opens the database on each tick, so a restored file is picked up without a restart.
export function startScheduler(config: BackupConfig, deps: SchedulerLoopDeps): RunningScheduler {
  const schedule = { timeZone: config.timeZone, dailyAt: config.dailyAt }
  const secrets = backupSecrets(config)
  let state: SchedulerState = {}
  let running: Promise<void> | undefined

  const tick = async () => {
    if (!existsSync(config.databasePath)) {
      deps.log.error(`${COMMAND}: database file not found at DATABASE_PATH`)
      return
    }
    const db = openDatabase(config.databasePath)
    try {
      state = await runSchedulerTick(state, {
        db,
        schedule,
        now: deps.now,
        log: deps.log,
        secrets,
        runJob: async (trigger) => {
          const run = await runBackup({
            db,
            databasePath: config.databasePath,
            store: deps.store,
            now: deps.now,
            trigger,
            secrets,
          })
          if (run.status === 'succeeded') {
            deps.log.info(`${COMMAND}: succeeded (${run.sizeBytes} bytes)`)
          } else {
            deps.log.error(`${COMMAND}: failed: ${run.error}`)
          }
        },
      })
    } finally {
      db.$client.close()
    }
  }

  const runTick = () => {
    if (running) return
    running = tick()
      .catch((error: unknown) => {
        const detail = error instanceof Error ? error.message : String(error)
        deps.log.error(`${COMMAND}: ${toFailureReason('run not recorded', detail, secrets)}`)
      })
      .finally(() => {
        running = undefined
      })
  }

  const timer = setInterval(runTick, deps.intervalMs ?? SCHEDULER_INTERVAL_MS)
  runTick()
  deps.log.info(`${COMMAND}: daily at ${config.dailyAt} ${config.timeZone}`)

  return {
    stop: async () => {
      clearInterval(timer)
      await running
    },
  }
}

if (isEntryPoint(import.meta.url)) {
  const config = loadBackupConfig(process.env)
  const scheduler = startScheduler(config, {
    store: createResticStore(config),
    now: () => new Date(),
    log: console,
  })
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.once(signal, () => {
      console.log(`${COMMAND}: ${signal} received, stopping`)
      void scheduler.stop()
    })
  }
}
