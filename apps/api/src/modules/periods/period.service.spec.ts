import { describe, expect, it } from 'vitest'
import { runSeed } from '../../db/seed.js'
import { createTestDatabase } from '../../test/database.js'
import { recordWorkout } from '../../test/workouts.js'
import { addExercise } from '../catalog/exercise.service.js'
import { addMuscle } from '../catalog/muscle.service.js'
import { createProgram } from '../programs/program.service.js'
import { listMuscleGroupLevels } from '../windows/progress.service.js'
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
    it('Then should store period 1 from the Monday of the week, 12 weeks long, with no intention', () => {
      const db = createTestDatabase()

      const current = ensurePeriods(db, new Date('2026-11-25T13:00:00.000Z'), SAO_PAULO)

      expect(listPeriods(db).map(({ id: _id, ...row }) => row)).toEqual([
        {
          number: 1,
          startsAt: '2026-11-23T03:00:00.000Z',
          endsAt: '2027-02-15T03:00:00.000Z',
          intention: null,
          frozenAt: null,
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
