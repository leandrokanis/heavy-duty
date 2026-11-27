import { describe, expect, it } from 'vitest'
import { runSeed } from '../../db/seed.js'
import { createTestDatabase } from '../../test/database.js'
import { recordWorkout } from '../../test/workouts.js'
import { addExercise } from '../catalog/exercise.service.js'
import { addMuscle } from '../catalog/muscle.service.js'
import { createProgram } from '../programs/program.service.js'
import { listMuscleGroupLevels } from '../windows/progress.service.js'
import { setWeeklyGoal } from '../windows/weekly-goal.service.js'
import { listPeriods } from './period.repository.js'
import { ensurePeriods, getCurrentPeriod, setPeriodIntention } from './period.service.js'

const SAO_PAULO = 'America/Sao_Paulo'

async function givenBackHistory(now: Date) {
  const db = createTestDatabase()
  runSeed(db)
  addMuscle(db, { name: 'grande dorsal', muscleGroupSlug: 'back' })
  addExercise(db, { name: 'Remada', kind: 'reps', primaryMuscleSlugs: ['grande-dorsal'] })
  const programId = createProgram(db, { name: 'Programa 1', goal: 'hypertrophy' }, now).id
  const train = (startedAt: string) =>
    recordWorkout(
      db,
      {
        programId,
        letter: 'A',
        startedAt,
        sets: Array.from({ length: 3 }, () => ({ exerciseSlug: 'remada', loadG: 40000, reps: 10 })),
      },
      now,
    )
  return { db, train }
}

describe('Given a database with no period', () => {
  describe('When the periods are ensured on a Wednesday', () => {
    it('Then should store period 1 from the Monday of the week, 12 weeks long, with no intention and no snapshot', () => {
      const db = createTestDatabase()

      const current = ensurePeriods(db, new Date('2026-11-25T13:00:00.000Z'), SAO_PAULO)

      expect(listPeriods(db).map(({ id: _id, ...row }) => row)).toEqual([
        {
          number: 1,
          startsAt: '2026-11-23T03:00:00.000Z',
          endsAt: '2027-02-15T03:00:00.000Z',
          intention: null,
          frozenAt: null,
          windowsUsed: null,
          windowsMissed: null,
          points: null,
          bestWorkoutPoints: null,
          weekStreak: null,
        },
      ])
      expect(current.number).toBe(1)
    })
  })

  describe('When the periods are ensured twice', () => {
    it('Then should keep one row', () => {
      const db = createTestDatabase()

      ensurePeriods(db, new Date('2026-11-25T13:00:00.000Z'), SAO_PAULO)
      ensurePeriods(db, new Date('2026-11-26T13:00:00.000Z'), SAO_PAULO)

      expect(listPeriods(db)).toHaveLength(1)
    })
  })
})

describe('Given period 1 stored and the server stopped for two periods', () => {
  describe('When the periods are ensured in period 3', () => {
    it('Then should store periods 2 and 3 by arithmetic from period 1, with no intention', () => {
      const db = createTestDatabase()
      ensurePeriods(db, new Date('2026-11-25T13:00:00.000Z'), SAO_PAULO)

      const current = ensurePeriods(db, new Date('2027-06-01T12:00:00.000Z'), SAO_PAULO)

      expect(
        listPeriods(db).map(({ number, startsAt, intention }) => [number, startsAt, intention]),
      ).toEqual([
        [1, '2026-11-23T03:00:00.000Z', null],
        [2, '2027-02-15T03:00:00.000Z', null],
        [3, '2027-05-10T03:00:00.000Z', null],
      ])
      expect(current.number).toBe(3)
    })
  })
})

describe('Given period 1 stored and the zone of the server changed later', () => {
  describe('When the periods are ensured', () => {
    it('Then should keep the stored start of period 1', () => {
      const db = createTestDatabase()
      ensurePeriods(db, new Date('2026-11-25T13:00:00.000Z'), SAO_PAULO)

      const current = ensurePeriods(db, new Date('2026-11-26T13:00:00.000Z'), 'Asia/Tokyo')

      expect(current.startsAt).toBe('2026-11-23T03:00:00.000Z')
    })
  })
})

// The sessions of access expire in 30 days, so the periods that follow are read from the service.
describe('Given back trained at the end of period 1 (the level crosses the period)', () => {
  const START = new Date('2026-11-21T10:00:00.000Z')
  const BEFORE_END = new Date('2027-02-08T02:00:00.000Z')
  const AFTER_END = new Date('2027-02-08T04:00:00.000Z')

  async function lastDaysOfPeriod1() {
    const { db, train } = await givenBackHistory(START)
    ensurePeriods(db, START, SAO_PAULO)
    train('2027-02-03T10:00:00.000Z')
    train('2027-02-05T10:00:00.000Z')
    return db
  }

  const backOf = <T extends { muscleGroup: { slug: string } }>(groups: T[]) =>
    groups.find(({ muscleGroup }) => muscleGroup.slug === 'back')

  describe('When period 2 starts', () => {
    it('Then back should keep its level', async () => {
      const db = await lastDaysOfPeriod1()

      expect(backOf(listMuscleGroupLevels(db, AFTER_END).groups)).toEqual(
        backOf(listMuscleGroupLevels(db, BEFORE_END).groups),
      )
    })

    it('Then the goals and the progress of back in the period should start from zero', async () => {
      const db = await lastDaysOfPeriod1()

      const period = getCurrentPeriod(db, AFTER_END, SAO_PAULO)

      expect({
        number: period.number,
        week: period.week,
        windows: period.windows,
        back: backOf(period.groups),
      }).toEqual({
        number: 2,
        week: 1,
        windows: { windowsUsed: 0, windowsMissed: 0, usedPercent: null, targetPercent: 70 },
        back: {
          muscleGroup: { slug: 'back', name: 'costas' },
          windowsUsed: 0,
          windowsMissed: 0,
          usedPercent: null,
        },
      })
    })

    it('Then period 1 should keep the window used in it', async () => {
      const db = await lastDaysOfPeriod1()

      expect(getCurrentPeriod(db, BEFORE_END, SAO_PAULO).windows).toMatchObject({ windowsUsed: 1 })
    })
  })
})

describe('Given period 1 has an intention', () => {
  describe('When period 2 starts', () => {
    it('Then period 2 should start with no intention', () => {
      const db = createTestDatabase()
      setPeriodIntention(
        db,
        { intention: 'Treinar três vezes por semana.' },
        new Date('2026-11-25T13:00:00.000Z'),
        SAO_PAULO,
      )

      expect(getCurrentPeriod(db, new Date('2027-02-20T13:00:00.000Z'), SAO_PAULO)).toMatchObject({
        number: 2,
        intention: null,
      })
    })
  })
})

// Back trained on Monday and Thursday of weeks 2 to 4: the Thursday falls in the window of the
// Monday, which opens 44 h after it, and the next Monday in the window of the Thursday.
describe('Given the weekly goal of 1 window met in weeks 2 to 4 of period 1 (US-F11-03)', () => {
  const START = new Date('2026-11-25T13:00:00.000Z')
  const WEEK_2 = Date.parse('2026-11-30T03:00:00.000Z')
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000

  async function threeWeeks() {
    const { db, train } = await givenBackHistory(START)
    ensurePeriods(db, START, SAO_PAULO)
    setWeeklyGoal(db, { weeklyGoal: 1 }, START)
    for (let index = 0; index < 3; index += 1) {
      const mondayMs = WEEK_2 + index * WEEK_MS
      train(new Date(mondayMs + 10 * 60 * 60 * 1000).toISOString())
      train(new Date(mondayMs + 3 * 24 * 60 * 60 * 1000).toISOString())
    }
    return db
  }

  describe('When the period is read on Tuesday of week 5', () => {
    it('Then the streak should be 3 weeks, week 1 missed with no streak to protect and week 5 pending', async () => {
      const db = await threeWeeks()

      const period = getCurrentPeriod(db, new Date('2026-12-22T15:00:00.000Z'), SAO_PAULO)

      expect({
        streak: period.weekStreak,
        weeks: period.weeks.map(({ week, weeklyGoal, windowsUsed, status }) => [
          week,
          weeklyGoal,
          windowsUsed,
          status,
        ]),
      }).toEqual({
        streak: { weeks: 3, protectionUsed: false },
        weeks: [
          [1, 1, 0, 'missed'],
          [2, 1, 1, 'met'],
          [3, 1, 2, 'met'],
          [4, 1, 2, 'met'],
          [5, 1, 0, 'pending'],
        ],
      })
    })
  })

  describe('When week 5 ends with no window used', () => {
    it('Then the streak should stay at 3 and the protection of the period should be used', async () => {
      const db = await threeWeeks()

      const period = getCurrentPeriod(db, new Date('2026-12-29T15:00:00.000Z'), SAO_PAULO)

      expect([period.weekStreak, period.weeks[4]?.status]).toEqual([
        { weeks: 3, protectionUsed: true },
        'protected',
      ])
    })
  })

  describe('When weeks 5 and 6 end with no window used', () => {
    it('Then the streak should go back to zero', async () => {
      const db = await threeWeeks()

      const period = getCurrentPeriod(db, new Date('2027-01-05T15:00:00.000Z'), SAO_PAULO)

      expect([period.weekStreak, period.weeks[5]?.status]).toEqual([
        { weeks: 0, protectionUsed: true },
        'missed',
      ])
    })
  })
})

describe('Given back trained before period 1 and three times in it (US-F19-02)', () => {
  const NOW = new Date('2026-11-27T13:00:00.000Z')

  // Back after a month: double; inside the window of the first: double; 2 h later: common.
  async function rankingOfHistory() {
    const { db, train } = await givenBackHistory(NOW)
    ensurePeriods(db, NOW, SAO_PAULO)
    train('2026-11-02T10:00:00.000Z')
    const back = train('2026-11-23T10:00:00.000Z')
    const inWindow = train('2026-11-25T10:00:00.000Z')
    const early = train('2026-11-25T12:00:00.000Z')
    const { ranking, weeks } = getCurrentPeriod(db, NOW, SAO_PAULO)
    return { ranking, weeks, back, inWindow, early }
  }

  describe('When the current period is read', () => {
    it('Then the ranking should hold only the workouts of the period, by points, ties sharing the position', async () => {
      const { ranking, back, inWindow, early } = await rankingOfHistory()

      expect(
        ranking.map(({ workoutId, points, position }) => [workoutId, points, position]),
      ).toEqual([
        [back, 60, 1],
        [inWindow, 60, 1],
        [early, 30, 3],
      ])
    })

    it('Then each workout of the ranking should carry its letter and its start', async () => {
      const { ranking } = await rankingOfHistory()

      expect(ranking[0]).toMatchObject({ letter: 'A', startedAt: '2026-11-23T10:00:00.000Z' })
    })

    it('Then week 1 should hold the points of the 3 workouts that started in it (D102)', async () => {
      const { weeks } = await rankingOfHistory()

      expect(weeks.map(({ week, points }) => [week, points])).toEqual([[1, 150]])
    })
  })
})
