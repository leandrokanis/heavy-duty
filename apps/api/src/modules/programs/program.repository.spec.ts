import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { createId } from '../../db/id.js'
import { exercises, plannedExercises, programDays } from '../../db/schema.js'
import { createTestDatabase } from '../../test/database.js'
import { insertActiveProgram } from './program.repository.js'
import type { Goal } from './programs.schemas.js'

function throws(action: () => void): boolean {
  try {
    action()
    return false
  } catch {
    return true
  }
}

describe('Given an active program', () => {
  describe('When a new program is inserted with a goal that violates the check', () => {
    it('Then should throw and the previous program should still be the only active one', () => {
      const db = createTestDatabase()
      const previousId = createId()
      insertActiveProgram(db, {
        id: previousId,
        name: 'Programa 1',
        goal: 'hypertrophy',
        createdAt: '2026-11-21T10:00:00.000Z',
      })

      const insert = () =>
        insertActiveProgram(db, {
          id: createId(),
          name: 'Programa 2',
          goal: 'weightlifting' as Goal,
          createdAt: '2026-11-21T10:01:00.000Z',
        })
      const threw = throws(insert)
      const active = db.$client.prepare('SELECT id FROM programs WHERE is_active = 1').all()

      expect({ threw, active }).toEqual({ threw: true, active: [{ id: previousId }] })
    })
  })
})

describe('Given an exercise used by a planned exercise', () => {
  describe('When the exercise row is deleted', () => {
    it('Then should throw a foreign key error and keep the exercise', () => {
      const db = createTestDatabase()
      const programId = createId()
      const programDayId = createId()
      const exerciseId = createId()
      insertActiveProgram(db, {
        id: programId,
        name: 'Programa 1',
        goal: 'hypertrophy',
        createdAt: '2026-11-21T10:00:00.000Z',
      })
      db.insert(exercises)
        .values({ id: exerciseId, slug: 'supino-reto', name: 'Supino reto', kind: 'reps' })
        .run()
      db.insert(programDays)
        .values({ id: programDayId, programId, letter: 'A', label: null, position: 1 })
        .run()
      db.insert(plannedExercises)
        .values({
          id: createId(),
          programDayId,
          exerciseId,
          position: 1,
          sets: 3,
          targetReps: 10,
          targetSeconds: null,
          loadG: 40000,
          restSeconds: 90,
        })
        .run()

      let error: unknown
      try {
        db.delete(exercises).where(eq(exercises.id, exerciseId)).run()
      } catch (caught) {
        error = caught
      }
      const kept = db.select({ id: exercises.id }).from(exercises).all()

      expect({ message: (error as Error | undefined)?.message, kept }).toEqual({
        message: 'FOREIGN KEY constraint failed',
        kept: [{ id: exerciseId }],
      })
    })
  })
})
