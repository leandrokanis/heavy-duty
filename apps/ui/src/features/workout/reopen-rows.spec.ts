import { describe, expect, it } from 'vitest'
import { reopenRowsOf } from './reopen-rows'
import { CHEST, SUPINO_RETO, TRICEPS, TRICEPS_POLIA, todayDay } from './test-today'
import type { ActivityWindows, GroupWindow } from './windows.types'
import type { RecordWorkoutSetBody } from './workout-set.types'

const WORKOUT_START = '2026-11-21T18:30:00.000Z'
const WORKOUT_START_MS = Date.parse(WORKOUT_START)
const OPENS_AT = '2026-11-23T18:30:00.000Z'

function setOf(plannedExerciseId: string, setNumber = 1): RecordWorkoutSetBody {
  return {
    id: `${plannedExerciseId}-${setNumber}`,
    workout: { programId: 'program-1', letter: 'A', startedAt: WORKOUT_START },
    plannedExerciseId,
    exerciseId: `exercise-of-${plannedExerciseId}`,
    setNumber,
    loadG: 40000,
    reps: 10,
    performedAt: WORKOUT_START,
  }
}

function groupWindow(
  group: { slug: string; name: string },
  lastTrainedAt: string | null = WORKOUT_START,
  opensAt: string | null = OPENS_AT,
): GroupWindow {
  return {
    muscleGroup: group,
    state: 'resting',
    lastTrainedAt,
    opensAt,
    closesAt: opensAt,
  }
}

function windowsOf(...groups: GroupWindow[]): ActivityWindows {
  return { now: WORKOUT_START, groups }
}

describe('Given letter A with supino-reto (chest) and triceps-polia (triceps), both with sets recorded', () => {
  describe('When the rows of the reopening are listed with the windows of the API', () => {
    it('Then should return chest and triceps in the order of the letter, with the opensAt of each', () => {
      const day = todayDay('A', 'Superior', [SUPINO_RETO, TRICEPS_POLIA])

      const rows = reopenRowsOf({
        day,
        recorded: [setOf('planned-supino'), setOf('planned-triceps')],
        windows: windowsOf(groupWindow(TRICEPS), groupWindow(CHEST)),
        workoutStartMs: WORKOUT_START_MS,
      })

      expect(rows).toEqual([
        { slug: 'chest', name: 'peito', opensAtMs: Date.parse(OPENS_AT) },
        { slug: 'triceps', name: 'tríceps', opensAtMs: Date.parse(OPENS_AT) },
      ])
    })
  })
})

describe('Given a workout ended early with no set of triceps-polia', () => {
  describe('When the rows of the reopening are listed', () => {
    it('Then should return only the groups of the exercises with a set recorded', () => {
      const day = todayDay('A', 'Superior', [SUPINO_RETO, TRICEPS_POLIA])

      const rows = reopenRowsOf({
        day,
        recorded: [setOf('planned-supino')],
        windows: windowsOf(groupWindow(CHEST), groupWindow(TRICEPS)),
        workoutStartMs: WORKOUT_START_MS,
      })

      expect(rows.map(({ slug }) => slug)).toEqual(['chest'])
    })
  })
})

describe('Given a group whose last training is before the first set of this workout', () => {
  describe('When the rows of the reopening are listed', () => {
    it('Then should leave the group out', () => {
      const day = todayDay('A', 'Superior', [SUPINO_RETO])

      const rows = reopenRowsOf({
        day,
        recorded: [setOf('planned-supino')],
        windows: windowsOf(groupWindow(CHEST, '2026-11-20T18:30:00.000Z')),
        workoutStartMs: WORKOUT_START_MS,
      })

      expect(rows).toEqual([])
    })
  })
})

describe('Given a copy of the day saved before the exercises had muscle groups', () => {
  describe('When the rows of the reopening are listed', () => {
    it('Then should return no row instead of failing', () => {
      const { muscleGroups: _, ...withoutGroups } = SUPINO_RETO
      const day = todayDay('A', 'Superior', [withoutGroups as typeof SUPINO_RETO])

      const rows = reopenRowsOf({
        day,
        recorded: [setOf('planned-supino')],
        windows: windowsOf(groupWindow(CHEST)),
        workoutStartMs: WORKOUT_START_MS,
      })

      expect(rows).toEqual([])
    })
  })
})
