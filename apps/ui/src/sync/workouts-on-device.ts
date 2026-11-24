import { createActiveWorkoutStore, loadActiveWorkout } from './active-workout-store'
import { getLocalDb, type LocalDb } from './local-db'

// The workouts the phone may still send: the one in progress and those with items in the queue.
// Removing one from the history would not stick, as the queue would recreate it (ADR-032).
export function createWorkoutsOnDevice(
  getDb: () => Promise<LocalDb | null>,
  loadActive = createActiveWorkoutStore(getDb).load,
): (nowMs: number) => Promise<Set<string>> {
  return async (nowMs) => {
    const ids = new Set<string>()
    const active = await loadActive(nowMs)
    if (active) ids.add(active.session.workoutId)
    try {
      const db = await getDb()
      const pending = db ? await db.pendingSets.toArray() : []
      for (const { workoutId } of pending) ids.add(workoutId)
    } catch {
      // Without the database only the workout in memory is known.
    }
    return ids
  }
}

// The page store keeps the workout in progress in memory too, when IndexedDB is missing.
export const loadWorkoutsOnDevice = createWorkoutsOnDevice(getLocalDb, loadActiveWorkout)
