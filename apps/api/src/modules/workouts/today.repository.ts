import { desc, eq } from 'drizzle-orm'
import type { Database } from '../../db/connection.js'
import { workoutSets, workouts } from '../../db/schema.js'

export function findLastLoadG(db: Database, exerciseId: string): number | undefined {
  return db
    .select({ loadG: workoutSets.loadG })
    .from(workoutSets)
    .where(eq(workoutSets.exerciseId, exerciseId))
    .orderBy(desc(workoutSets.performedAt), desc(workoutSets.setNumber), desc(workoutSets.id))
    .limit(1)
    .get()?.loadG
}

export function findLastWorkoutLetter(db: Database, programId: string): string | null {
  return (
    db
      .select({ letter: workouts.letter })
      .from(workouts)
      .where(eq(workouts.programId, programId))
      .orderBy(desc(workouts.startedAt), desc(workouts.id))
      .limit(1)
      .get()?.letter ?? null
  )
}
