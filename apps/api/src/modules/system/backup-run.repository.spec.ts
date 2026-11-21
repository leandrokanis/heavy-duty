import { describe, expect, it } from 'vitest'
import { createId } from '../../db/id.js'
import { createTestDatabase } from '../../test/database.js'
import { insertBackupRun, listRecentBackupRuns } from './backup-run.repository.js'

function succeededRun(startedAt: string, finishedAt: string) {
  return {
    id: createId(),
    startedAt,
    finishedAt,
    status: 'succeeded' as const,
    sizeBytes: 4096,
    error: null,
  }
}

describe('Given three runs inserted out of chronological order', () => {
  describe('When the recent runs are listed with limit 2', () => {
    it('Then should return the two newest runs, newest first', () => {
      const db = createTestDatabase()
      const middle = succeededRun('2026-11-20T06:00:00.000Z', '2026-11-20T06:00:05.000Z')
      const newest = succeededRun('2026-11-21T06:00:00.000Z', '2026-11-21T06:00:05.000Z')
      const oldest = succeededRun('2026-11-19T06:00:00.000Z', '2026-11-19T06:00:05.000Z')
      for (const run of [middle, newest, oldest]) {
        insertBackupRun(db, run)
      }

      expect(listRecentBackupRuns(db, 2)).toEqual([newest, middle])
    })
  })
})
