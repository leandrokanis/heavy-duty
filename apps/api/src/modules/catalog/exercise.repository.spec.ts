import { describe, expect, it } from 'vitest'
import { createId } from '../../db/id.js'
import { createTestDatabase } from '../../test/database.js'
import { insertExerciseWithMuscles } from './exercise.repository.js'

function throws(action: () => void): boolean {
  try {
    action()
    return false
  } catch {
    return true
  }
}

describe('Given a migrated database', () => {
  describe('When an exercise is inserted with a muscle id that is not in the catalog', () => {
    it('Then should throw and leave no exercise and no exercise muscle stored', () => {
      const db = createTestDatabase()
      const exerciseId = createId()

      const insert = () =>
        insertExerciseWithMuscles(
          db,
          { id: exerciseId, slug: 'supino-reto', name: 'Supino reto', kind: 'reps' },
          [{ muscleId: createId(), role: 'primary' }],
        )
      const countRows = (table: string) =>
        (db.$client.prepare(`SELECT count(*) AS total FROM ${table}`).get() as { total: number })
          .total

      expect({
        threw: throws(insert),
        exercises: countRows('exercises'),
        exerciseMuscles: countRows('exercise_muscles'),
      }).toEqual({ threw: true, exercises: 0, exerciseMuscles: 0 })
    })
  })
})
