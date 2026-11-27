import { and, asc, eq, isNull } from 'drizzle-orm'
import type { Database } from '../../db/connection.js'
import { createId } from '../../db/id.js'
import { muscleGroups, periodSnapshots, periods } from '../../db/schema.js'
import type { PeriodSummary } from './period.repository.js'
import type { GroupSnapshot } from './snapshot.rules.js'

export type GroupSnapshotRow = Omit<GroupSnapshot, 'slug'> & {
  muscleGroup: { slug: string; name: string }
}

// The update on a null frozen_at claims the period, so a second caller writes nothing (ADR-039).
export function insertSnapshot(
  db: Database,
  period: { id: string; frozenAt: string },
  summary: PeriodSummary,
  groups: GroupSnapshot[],
): boolean {
  return db.transaction((tx) => {
    const claimed = tx
      .update(periods)
      .set({ ...summary, frozenAt: period.frozenAt })
      .where(and(eq(periods.id, period.id), isNull(periods.frozenAt)))
      .run()
    if (claimed.changes === 0) return false
    const groupIds = new Map(
      tx
        .select({ id: muscleGroups.id, slug: muscleGroups.slug })
        .from(muscleGroups)
        .all()
        .map(({ id, slug }) => [slug, id]),
    )
    const nowMs = Date.parse(period.frozenAt)
    for (const { slug, ...group } of groups) {
      const muscleGroupId = groupIds.get(slug)
      if (muscleGroupId === undefined) continue
      tx.insert(periodSnapshots)
        .values({ id: createId(nowMs), periodId: period.id, muscleGroupId, ...group })
        .run()
    }
    return true
  })
}

// The groups in catalog order.
export function listSnapshotGroups(db: Database, periodId: string): GroupSnapshotRow[] {
  return db
    .select({
      slug: muscleGroups.slug,
      name: muscleGroups.name,
      level: periodSnapshots.level,
      points: periodSnapshots.points,
      bestLevel: periodSnapshots.bestLevel,
      windowState: periodSnapshots.windowState,
      windowsUsed: periodSnapshots.windowsUsed,
      windowsMissed: periodSnapshots.windowsMissed,
    })
    .from(periodSnapshots)
    .innerJoin(muscleGroups, eq(periodSnapshots.muscleGroupId, muscleGroups.id))
    .where(eq(periodSnapshots.periodId, periodId))
    .orderBy(asc(muscleGroups.position))
    .all()
    .map(({ slug, name, ...group }) => ({ muscleGroup: { slug, name }, ...group }))
}
