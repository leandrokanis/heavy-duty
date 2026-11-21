import { RESUME_LIMIT_MS } from '@/features/workout/workout.config'
import type { WorkoutFlowState } from '@/features/workout/workout-flow'
import { getLocalDb, type LocalDb } from './local-db'
import type { ActiveWorkoutRow } from './sync.types'

const ROW_KEY = 'current'

export type ActiveWorkoutStore = {
  save(state: WorkoutFlowState, nowMs: number): Promise<void>
  // Null when nothing is saved or the last step is older than the resume limit; the old one is dropped.
  load(nowMs: number): Promise<WorkoutFlowState | null>
  clear(): Promise<void>
}

// The workout in progress lives in the database and, when it fails or is missing, in memory (FR-016).
export function createActiveWorkoutStore(getDb: () => Promise<LocalDb | null>): ActiveWorkoutStore {
  let memoryRow: ActiveWorkoutRow | null = null

  async function withDb<T>(use: (db: LocalDb) => Promise<T>): Promise<T | undefined> {
    try {
      const db = await getDb()
      return db ? await use(db) : undefined
    } catch {
      return undefined
    }
  }

  async function clear() {
    memoryRow = null
    await withDb((db) => db.activeWorkout.delete(ROW_KEY))
  }

  return {
    async save(state, nowMs) {
      const row: ActiveWorkoutRow = { key: ROW_KEY, savedAtMs: nowMs, state }
      memoryRow = row
      await withDb((db) => db.activeWorkout.put(row))
    },
    async load(nowMs) {
      const stored = await withDb((db) => db.activeWorkout.get(ROW_KEY))
      const row = stored ?? memoryRow
      if (!row) return null
      if (nowMs - row.savedAtMs > RESUME_LIMIT_MS) {
        await clear()
        return null
      }
      return row.state
    },
    clear,
  }
}

const pageStore = createActiveWorkoutStore(getLocalDb)

export const saveActiveWorkout = pageStore.save
export const loadActiveWorkout = pageStore.load
export const clearActiveWorkout = pageStore.clear
