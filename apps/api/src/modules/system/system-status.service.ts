import type { Database } from '../../db/connection.js'
import { findLastSuccessfulBackupRun, listRecentBackupRuns } from './backup-run.repository.js'
import type { SystemStatus } from './system.schemas.js'

export const RECENT_BACKUP_RUNS_LIMIT = 7

export function getSystemStatus(db: Database): SystemStatus {
  const recentRuns = listRecentBackupRuns(db, RECENT_BACKUP_RUNS_LIMIT)
  return {
    backup: {
      latestRun: recentRuns[0] ?? null,
      lastSuccessfulRun: findLastSuccessfulBackupRun(db) ?? null,
      recentRuns,
    },
  }
}
