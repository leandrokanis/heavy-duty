import { describe, expect, it } from 'vitest'
import { createApp } from '../../app.js'
import { createId } from '../../db/id.js'
import { createTestDatabase } from '../../test/database.js'
import { createSignedInApp } from '../../test/session.js'
import { claimNotification, finishNotification } from '../notifications/notification.repository.js'
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

      const body = (await response.json()) as { backup: unknown }
      expect({ status: response.status, backup: body.backup }).toEqual({
        status: 200,
        backup: { latestRun: null, lastSuccessfulRun: null, recentRuns: [] },
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

      expect(await response.json()).toMatchObject({
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

type NoticeRowInput = {
  channel: 'push' | 'email'
  createdAt: string
  status: 'sent' | 'failed' | 'skipped' | null
  error?: string | null
}

function recordNotice(db: ReturnType<typeof createTestDatabase>, row: NoticeRowInput): void {
  const id = createId(Date.parse(row.createdAt))
  claimNotification(db, {
    id,
    noticeKey: `window_close:B:${row.createdAt}`,
    kind: 'window_close',
    channel: row.channel,
    letter: 'B',
    muscleGroupSlugs: '["back","biceps"]',
    dueAt: row.createdAt,
    eventAt: '2026-11-23T13:00:00.000Z',
    createdAt: row.createdAt,
  })
  if (row.status === null) return
  finishNotification(db, id, {
    status: row.status,
    error: row.error ?? null,
    finishedAt: new Date(Date.parse(row.createdAt) + 1000).toISOString(),
  })
}

describe('Given no notice sent yet and only the email channel configured (US-F17-01)', () => {
  describe('When GET /api/system/status is requested', () => {
    it('Then notices should list push off and email on, with no send and no failure', async () => {
      const db = createTestDatabase()
      const app = createSignedInApp(
        createApp({ nodeEnv: 'test', databaseHealth: () => true, db, emailConfigured: true }),
        db,
      )

      const response = await app.request('/api/system/status')

      expect(((await response.json()) as { notices: unknown }).notices).toEqual({
        channels: [
          { channel: 'push', configured: false, lastSentAt: null, recentFailures: [] },
          { channel: 'email', configured: true, lastSentAt: null, recentFailures: [] },
        ],
      })
    })
  })
})

describe('Given an email sent, then six emails that failed, and a push sent (US-F17-01)', () => {
  describe('When GET /api/system/status is requested', () => {
    it('Then the email channel should show the last send and the five newest failures, with date and reason', async () => {
      const db = createTestDatabase()
      recordNotice(db, { channel: 'email', createdAt: '2026-11-20T00:00:00.000Z', status: 'sent' })
      for (const day of [21, 22, 23, 24, 25, 26]) {
        recordNotice(db, {
          channel: 'email',
          createdAt: `2026-11-${day}T00:00:00.000Z`,
          status: 'failed',
          error: day === 26 ? 'ECONNECTION' : 'EENVELOPE (SMTP 550)',
        })
      }
      recordNotice(db, { channel: 'email', createdAt: '2026-11-27T00:00:00.000Z', status: null })
      recordNotice(db, { channel: 'push', createdAt: '2026-11-26T00:00:00.000Z', status: 'sent' })
      const app = createSignedInApp(
        createApp({
          nodeEnv: 'test',
          databaseHealth: () => true,
          db,
          emailConfigured: true,
          pushPublicKey: 'BPublicKey',
        }),
        db,
      )

      const response = await app.request('/api/system/status')

      const { notices } = (await response.json()) as {
        notices: { channels: { recentFailures: { failedAt: string }[] }[] }
      }
      expect(notices).toEqual({
        channels: [
          {
            channel: 'push',
            configured: true,
            lastSentAt: '2026-11-26T00:00:01.000Z',
            recentFailures: [],
          },
          {
            channel: 'email',
            configured: true,
            lastSentAt: '2026-11-20T00:00:01.000Z',
            recentFailures: [26, 25, 24, 23, 22].map((day) => ({
              failedAt: `2026-11-${day}T00:00:01.000Z`,
              kind: 'window_close',
              letter: 'B',
              error: day === 26 ? 'ECONNECTION' : 'EENVELOPE (SMTP 550)',
            })),
          },
        ],
      })
    })
  })
})
