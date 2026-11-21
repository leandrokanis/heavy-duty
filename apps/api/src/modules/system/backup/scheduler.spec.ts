import { describe, expect, it } from 'vitest'
import { createId } from '../../../db/id.js'
import { createTestDatabase } from '../../../test/database.js'
import { insertBackupRun } from '../backup-run.repository.js'
import type { BackupTrigger } from './offsite-store.js'
import type { BackupSchedule } from './schedule.js'
import { runSchedulerTick, type SchedulerState } from './scheduler.js'

const SCHEDULE: BackupSchedule = { timeZone: 'America/Sao_Paulo', dailyAt: '03:00' }

// Throws without writing to backup_runs, so only the in-memory attempt can stop a retry.
function createFailingJob(): {
  triggers: BackupTrigger[]
  runJob: (trigger: BackupTrigger) => Promise<void>
} {
  const triggers: BackupTrigger[] = []
  return {
    triggers,
    runJob: async (trigger) => {
      triggers.push(trigger)
      throw new Error('run not recorded: no such table: backup_runs')
    },
  }
}

const silentLog = { info: () => {}, error: () => {} }

async function tickAt(
  state: SchedulerState,
  iso: string,
  deps: Omit<Parameters<typeof runSchedulerTick>[1], 'now' | 'schedule' | 'log'>,
): Promise<SchedulerState> {
  return runSchedulerTick(state, {
    ...deps,
    schedule: SCHEDULE,
    now: () => new Date(iso),
    log: silentLog,
  })
}

describe('Given a schedule at 03:00 and a job that fails', () => {
  describe('When two ticks run after 03:00 on the same local day', () => {
    it('Then the job should run once, with the scheduled trigger', async () => {
      const db = createTestDatabase()
      const job = createFailingJob()

      let state = await tickAt({}, '2026-11-21T06:01:00.000Z', { db, runJob: job.runJob })
      state = await tickAt(state, '2026-11-21T06:02:00.000Z', { db, runJob: job.runJob })

      expect(job.triggers).toEqual(['scheduled'])
    })
  })

  describe('When the next tick runs after 03:00 on the next local day', () => {
    it('Then the job should run again', async () => {
      const db = createTestDatabase()
      const job = createFailingJob()

      let state = await tickAt({}, '2026-11-21T06:01:00.000Z', { db, runJob: job.runJob })
      state = await tickAt(state, '2026-11-22T06:01:00.000Z', { db, runJob: job.runJob })

      expect(job.triggers).toEqual(['scheduled', 'scheduled'])
    })
  })
})

describe('Given a manual backup recorded at 06:30Z (03:30 local)', () => {
  describe('When a tick runs at 12:00Z on the same local day', () => {
    it('Then the job should not run, because the manual run counts as the day run', async () => {
      const db = createTestDatabase()
      insertBackupRun(db, {
        id: createId(),
        startedAt: '2026-11-21T06:30:00.000Z',
        finishedAt: '2026-11-21T06:30:04.000Z',
        status: 'succeeded',
        sizeBytes: 98304,
        error: null,
      })
      const job = createFailingJob()

      await tickAt({}, '2026-11-21T12:00:00.000Z', { db, runJob: job.runJob })

      expect(job.triggers).toEqual([])
    })
  })
})
