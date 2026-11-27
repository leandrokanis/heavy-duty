import { rmSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { migrateBefore } from '../test/migrations.js'
import { type Database, openDatabase } from './connection.js'
import { runMigrations } from './migrate.js'

const WEEKLY_DIGEST_MIGRATION_INDEX = 19

function givenWave7aNotifications(db: Database): void {
  db.$client.exec(`
    INSERT INTO notifications
      (id, notice_key, kind, channel, letter, muscle_group_slugs, due_at, event_at, created_at,
       status, error, finished_at, unsubscribe_token_hash)
    VALUES
      ('n-push', 'window_open:A:2026-11-20T21:00:00.000Z', 'window_open', 'push', 'A', '["chest"]',
       '2026-11-20T09:00:00.000Z', '2026-11-20T21:00:00.000Z', '2026-11-20T09:00:10.000Z',
       'sent', NULL, '2026-11-20T09:00:11.000Z', NULL),
      ('n-email', 'window_open:A:2026-11-20T21:00:00.000Z', 'window_open', 'email', 'A', '["chest"]',
       '2026-11-20T09:00:00.000Z', '2026-11-20T21:00:00.000Z', '2026-11-20T09:00:10.000Z',
       'sent', NULL, '2026-11-20T09:00:12.000Z', 'hash-1');
  `)
}

function insertWeeklyDigest(db: Database, id: string): void {
  db.$client
    .prepare(
      `INSERT INTO notifications
        (id, notice_key, kind, channel, letter, muscle_group_slugs, due_at, event_at, created_at)
      VALUES (?, 'weekly_digest:2026-11-30T03:00:00.000Z', 'weekly_digest', 'email', NULL, NULL,
        '2026-12-07T10:00:00.000Z', '2026-12-07T03:00:00.000Z', '2026-12-07T10:00:05.000Z')`,
    )
    .run(id)
}

describe('Given the notices of wave 7a stored before the weekly digest', () => {
  let db: Database | undefined
  let folder: string | undefined

  afterEach(() => {
    db?.$client.close()
    if (folder) rmSync(folder, { recursive: true, force: true })
  })

  describe('When the migration of the weekly digest runs', () => {
    it('Then it should keep the rows of the notices as they were', () => {
      db = openDatabase(':memory:')
      folder = migrateBefore(db, WEEKLY_DIGEST_MIGRATION_INDEX)
      givenWave7aNotifications(db)

      runMigrations(db)

      expect(
        db.$client
          .prepare(
            'SELECT id, kind, channel, status, unsubscribe_token_hash AS hash FROM notifications ORDER BY id',
          )
          .all(),
      ).toEqual([
        { id: 'n-email', kind: 'window_open', channel: 'email', status: 'sent', hash: 'hash-1' },
        { id: 'n-push', kind: 'window_open', channel: 'push', status: 'sent', hash: null },
      ])
    })

    it('Then it should accept a weekly digest once per week and channel', () => {
      db = openDatabase(':memory:')
      folder = migrateBefore(db, WEEKLY_DIGEST_MIGRATION_INDEX)
      runMigrations(db)

      insertWeeklyDigest(db, 'd-1')

      expect(() => insertWeeklyDigest(db as Database, 'd-2')).toThrow(/UNIQUE/)
    })
  })
})
