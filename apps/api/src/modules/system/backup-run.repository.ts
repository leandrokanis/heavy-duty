import { desc, eq } from 'drizzle-orm'
import type { Database } from '../../db/connection.js'
import { backupRuns } from '../../db/schema.js'

export type BackupRunRow = typeof backupRuns.$inferSelect

export function insertBackupRun(db: Database, run: BackupRunRow): void {
  db.insert(backupRuns).values(run).run()
}

export function listRecentBackupRuns(db: Database, limit: number): BackupRunRow[] {
  return db.select().from(backupRuns).orderBy(desc(backupRuns.startedAt)).limit(limit).all()
}

export function findLastSuccessfulBackupRun(db: Database): BackupRunRow | undefined {
  return db
    .select()
    .from(backupRuns)
    .where(eq(backupRuns.status, 'succeeded'))
    .orderBy(desc(backupRuns.startedAt))
    .limit(1)
    .get()
}

export function findLatestBackupRunStartedAt(db: Database): string | undefined {
  return db
    .select({ startedAt: backupRuns.startedAt })
    .from(backupRuns)
    .orderBy(desc(backupRuns.startedAt))
    .limit(1)
    .get()?.startedAt
}
