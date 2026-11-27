import { describe, expect, it } from 'vitest'
import { workoutSets } from '../../db/schema.js'
import { runSeed } from '../../db/seed.js'
import { createTestDatabase } from '../../test/database.js'
import { recordWorkout } from '../../test/workouts.js'
import { addExercise } from '../catalog/exercise.service.js'
import { addMuscle } from '../catalog/muscle.service.js'
import { createProgram } from '../programs/program.service.js'
import { listMuscleGroupLevels } from '../windows/progress.service.js'
import { setWeeklyGoal } from '../windows/weekly-goal.service.js'
import { ensurePeriods } from './period.service.js'
import { freezeEndedPeriods, listPeriodsWithSnapshots } from './snapshot.service.js'

const SAO_PAULO = 'America/Sao_Paulo'
const START = new Date('2026-11-25T13:00:00.000Z')
// Period 1 goes from 2026-11-23 to 2027-02-15 at 03:00 UTC; week 11 starts on 2027-02-01.
const PERIOD_1_END = '2027-02-15T03:00:00.000Z'
const AFTER_END = new Date('2027-02-15T03:01:00.000Z')
const DAY_MS = 24 * 60 * 60 * 1000

// Back on Monday and Thursday of weeks 11 and 12, with a weekly goal of 1 window: each workout
// after the first falls in the window of the one before, so weeks 11 and 12 meet the goal.
function givenTheLastTwoWeeksOfPeriod1() {
  const db = createTestDatabase()
  runSeed(db)
  addMuscle(db, { name: 'grande dorsal', muscleGroupSlug: 'back' })
  addExercise(db, { name: 'Remada', kind: 'reps', primaryMuscleSlugs: ['grande-dorsal'] })
  const programId = createProgram(db, { name: 'Programa 1', goal: 'hypertrophy' }, START).id
  ensurePeriods(db, START, SAO_PAULO)
  setWeeklyGoal(db, { weeklyGoal: 1 }, START)
  const week11Ms = Date.parse('2027-02-01T13:00:00.000Z')
  for (const dayOffset of [0, 3, 7, 10]) {
    recordWorkout(
      db,
      {
        programId,
        letter: 'A',
        startedAt: new Date(week11Ms + dayOffset * DAY_MS).toISOString(),
        sets: Array.from({ length: 3 }, () => ({ exerciseSlug: 'remada', loadG: 40000, reps: 10 })),
      },
      START,
    )
  }
  return db
}

const backOf = <T extends { muscleGroup: { slug: string } }>(groups: T[]) =>
  groups.find(({ muscleGroup }) => muscleGroup.slug === 'back')

describe('Given period 1 ended a minute ago with back trained in its last two weeks (US-F11-02)', () => {
  describe('When the ended periods are frozen', () => {
    it('Then period 1 should keep the windows, the points, the best workout and the streak at its end', () => {
      const db = givenTheLastTwoWeeksOfPeriod1()

      freezeEndedPeriods(db, AFTER_END, SAO_PAULO)

      const period1 = listPeriodsWithSnapshots(db, AFTER_END, SAO_PAULO).periods.find(
        ({ number }) => number === 1,
      )
      expect(period1).toMatchObject({
        frozenAt: AFTER_END.toISOString(),
        snapshot: {
          windowsUsed: 3,
          windowsMissed: 0,
          usedPercent: 100,
          points: 210,
          bestWorkoutPoints: 60,
          weekStreak: 2,
        },
      })
    })

    it('Then back should keep the level, the bar and the window it had at the end', () => {
      const db = givenTheLastTwoWeeksOfPeriod1()
      const atEnd = backOf(listMuscleGroupLevels(db, new Date(PERIOD_1_END)).groups)

      freezeEndedPeriods(db, AFTER_END, SAO_PAULO)

      const period1 = listPeriodsWithSnapshots(db, AFTER_END, SAO_PAULO).periods[1]
      expect(backOf(period1?.snapshot?.groups ?? [])).toEqual({
        muscleGroup: { slug: 'back', name: 'costas' },
        level: atEnd?.level,
        points: atEnd?.points,
        bestLevel: atEnd?.bestLevel,
        tier: atEnd?.tier,
        windowState: 'open',
        windowsUsed: 3,
        windowsMissed: 0,
        usedPercent: 100,
      })
    })

    it('Then the list should start with period 2, open and with no snapshot', () => {
      const db = givenTheLastTwoWeeksOfPeriod1()

      const { periods } = listPeriodsWithSnapshots(db, AFTER_END, SAO_PAULO)

      expect(periods.map(({ number, frozenAt, snapshot }) => [number, frozenAt, snapshot])).toEqual(
        [
          [2, null, null],
          [1, AFTER_END.toISOString(), expect.objectContaining({ weekStreak: 2 })],
        ],
      )
    })
  })

  describe('When the ended periods are frozen twice', () => {
    it('Then period 1 should keep the first snapshot and its instant', () => {
      const db = givenTheLastTwoWeeksOfPeriod1()
      freezeEndedPeriods(db, AFTER_END, SAO_PAULO)
      const first = listPeriodsWithSnapshots(db, AFTER_END, SAO_PAULO).periods[1]

      const frozenAgain = freezeEndedPeriods(db, new Date('2027-02-16T12:00:00.000Z'), SAO_PAULO)

      expect({
        frozenAgain,
        period1: listPeriodsWithSnapshots(db, AFTER_END, SAO_PAULO).periods[1],
      }).toEqual({ frozenAgain: 0, period1: first })
    })
  })

  describe('When a set of period 1 is edited after the freeze (retrato congelado)', () => {
    it('Then the snapshot should stay the same', () => {
      const db = givenTheLastTwoWeeksOfPeriod1()
      freezeEndedPeriods(db, AFTER_END, SAO_PAULO)
      const before = listPeriodsWithSnapshots(db, AFTER_END, SAO_PAULO).periods[1]

      db.update(workoutSets).set({ loadG: 80000 }).run()

      expect(listPeriodsWithSnapshots(db, AFTER_END, SAO_PAULO).periods[1]).toEqual(before)
    })
  })
})

describe('Given period 1 still running', () => {
  describe('When the ended periods are frozen', () => {
    it('Then nothing should be frozen', () => {
      const db = givenTheLastTwoWeeksOfPeriod1()
      const lastMinute = new Date(Date.parse(PERIOD_1_END) - 60_000)

      expect({
        frozen: freezeEndedPeriods(db, lastMinute, SAO_PAULO),
        periods: listPeriodsWithSnapshots(db, lastMinute, SAO_PAULO).periods.map(
          ({ snapshot }) => snapshot,
        ),
      }).toEqual({ frozen: 0, periods: [null] })
    })
  })
})
