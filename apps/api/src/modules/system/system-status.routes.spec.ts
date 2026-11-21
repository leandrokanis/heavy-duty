import { describe, expect, it } from 'vitest'
import { createApp } from '../../app.js'
import { createId } from '../../db/id.js'
import { createTestDatabase } from '../../test/database.js'
import { createSignedInApp } from '../../test/session.js'
import { type BackupRunRow, insertBackupRun } from './backup-run.repository.js'

function backupRun(fields: Partial<BackupRunRow> & Pick<BackupRunRow, 'startedAt'>): BackupRunRow {
  const finishedAt = new Date(Date.parse(fields.startedAt) + 4000).toISOString()
  return {
    id: createId(),
    finishedAt,
    status: 'failed',
    sizeBytes: null,
    error: 'offsite copy failed: backup tool timed out',
    ...fields,
  }
}

describe('Given a migrated database with no backup run', () => {
  describe('When GET /api/system/status is requested', () => {
    it('Then should respond 200 with latestRun null, lastSuccessfulRun null and an empty recentRuns', async () => {
      const db = createTestDatabase()
      const app = createSignedInApp(
        createApp({ nodeEnv: 'test', databaseHealth: () => true, db }),
        db,
      )

      const response = await app.request('/api/system/status')

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 200,
        body: { backup: { latestRun: null, lastSuccessfulRun: null, recentRuns: [] } },
      })
    })
  })
})

describe('Given a succeeded run on 2026-11-19, eight more runs, and a failed run on 2026-11-21', () => {
  describe('When GET /api/system/status is requested', () => {
    it('Then latestRun should be the failed run, lastSuccessfulRun the newest succeeded run, and recentRuns the seven newest runs, newest first', async () => {
      const db = createTestDatabase()
      const succeeded = backupRun({
        startedAt: '2026-11-19T06:00:00.000Z',
        status: 'succeeded',
        sizeBytes: 98304,
        error: null,
      })
      const failedInBetween = Array.from({ length: 8 }, (_, hour) =>
        backupRun({ startedAt: `2026-11-20T0${hour}:00:00.000Z` }),
      )
      const latestFailed = backupRun({
        startedAt: '2026-11-21T06:00:00.000Z',
        finishedAt: '2026-11-21T06:00:02.000Z',
        error: 'offsite copy failed: repository does not exist',
      })
      for (const run of [latestFailed, succeeded, ...[...failedInBetween].reverse()]) {
        insertBackupRun(db, run)
      }
      const app = createSignedInApp(
        createApp({ nodeEnv: 'test', databaseHealth: () => true, db }),
        db,
      )

      const response = await app.request('/api/system/status')

      expect(await response.json()).toEqual({
        backup: {
          latestRun: {
            id: latestFailed.id,
            startedAt: '2026-11-21T06:00:00.000Z',
            finishedAt: '2026-11-21T06:00:02.000Z',
            status: 'failed',
            sizeBytes: null,
            error: 'offsite copy failed: repository does not exist',
          },
          lastSuccessfulRun: succeeded,
          recentRuns: [latestFailed, ...failedInBetween.slice(2).reverse()],
        },
      })
    })
  })
})
