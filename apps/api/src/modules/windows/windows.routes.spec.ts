import { describe, expect, it } from 'vitest'
import { createApp } from '../../app.js'
import { createTestDatabase } from '../../test/database.js'
import { createProgramTestApp } from '../../test/programs.js'
import { recordWorkout } from '../../test/workouts.js'
import { addExercise } from '../catalog/exercise.service.js'
import { addMuscle } from '../catalog/muscle.service.js'
import type { ActivityWindows, MuscleGroupLevels } from './windows.schemas.js'

const CATALOG_ORDER = [
  'chest',
  'back',
  'lower-back',
  'shoulders',
  'biceps',
  'triceps',
  'abs',
  'quadriceps',
  'hamstrings',
  'glutes',
  'calves',
]

describe('Given a database with no workout', () => {
  describe('When GET /api/windows is called', () => {
    it('Then should respond 200 with now and the 11 groups in catalog order, all none', async () => {
      const { app, clock } = createProgramTestApp()

      const response = await app.request('/api/windows')
      const body = (await response.json()) as ActivityWindows

      expect({
        status: response.status,
        now: body.now,
        groups: body.groups.map(({ muscleGroup, state, lastTrainedAt, opensAt, closesAt }) => [
          muscleGroup.slug,
          state,
          lastTrainedAt,
          opensAt,
          closesAt,
        ]),
      }).toEqual({
        status: 200,
        now: clock.now().toISOString(),
        groups: CATALOG_ORDER.map((slug) => [slug, 'none', null, null, null]),
      })
    })
  })
})

type Goal = 'strength' | 'hypertrophy' | 'endurance'

// The clock of the test app starts at 2026-11-21T10:00:00.000Z.
async function givenCatalogAndHistory(goal: Goal = 'hypertrophy') {
  const testApp = createProgramTestApp()
  const { app, db } = testApp
  addMuscle(db, { name: 'grande dorsal', muscleGroupSlug: 'back' })
  addMuscle(db, { name: 'reto femoral', muscleGroupSlug: 'quadriceps' })
  addExercise(db, { name: 'Remada', kind: 'reps', primaryMuscleSlugs: ['grande-dorsal'] })
  addExercise(db, { name: 'Extensora', kind: 'reps', primaryMuscleSlugs: ['reto-femoral'] })
  const created = await app.request('/api/programs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Programa 1', goal }),
  })
  const programId = ((await created.json()) as { id: string }).id
  const train = (exerciseSlug: string, startedAt: string, loadG = 40000) =>
    recordWorkout(
      db,
      {
        programId,
        letter: 'A',
        startedAt,
        sets: Array.from({ length: 3 }, () => ({ exerciseSlug, loadG, reps: 10 })),
      },
      testApp.clock.now(),
    )
  return { ...testApp, train }
}

async function getWindows(app: { request: (path: string) => Response | Promise<Response> }) {
  return (await (await app.request('/api/windows')).json()) as ActivityWindows
}

function groupOf(windows: ActivityWindows, slug: string) {
  return windows.groups.find(({ muscleGroup }) => muscleGroup.slug === slug)
}

describe('Given chest trained now, at 7h in Brasilia, with 1,200 kg of volume', () => {
  describe('When GET /api/windows is called', () => {
    it('Then chest should be resting, with the opening 44 h after the training', async () => {
      const { app, train } = await givenCatalogAndHistory()
      train('supino-reto', '2026-11-21T10:00:00.000Z')

      const chest = groupOf(await getWindows(app), 'chest')

      expect(chest).toMatchObject({
        state: 'resting',
        lastTrainedAt: '2026-11-21T10:00:00.000Z',
        opensAt: '2026-11-23T06:00:00.000Z',
        closesAt: '2026-11-26T10:00:00.000Z',
      })
    })
  })
})

describe('Given the window of back opened and has not closed', () => {
  describe('When GET /api/windows is called', () => {
    it('Then back should be open, with the closing instant', async () => {
      const { app, train } = await givenCatalogAndHistory()
      train('remada', '2026-11-18T10:00:00.000Z')

      const back = groupOf(await getWindows(app), 'back')

      expect(back).toMatchObject({ state: 'open', closesAt: '2026-11-23T10:00:00.000Z' })
    })
  })
})

describe('Given the window of quadriceps closed with no training of quadriceps', () => {
  describe('When GET /api/windows is called', () => {
    it('Then quadriceps should be cooling since the closing, and calves none', async () => {
      const { app, train } = await givenCatalogAndHistory()
      train('extensora', '2026-11-12T10:00:00.000Z')

      const windows = await getWindows(app)

      expect([groupOf(windows, 'quadriceps'), groupOf(windows, 'calves')]).toMatchObject([
        { state: 'cooling', closesAt: '2026-11-17T10:00:00.000Z' },
        { state: 'none', lastTrainedAt: null, opensAt: null, closesAt: null },
      ])
    })
  })
})

describe('Given back trained long ago and again 3 days ago', () => {
  describe('When GET /api/windows is called', () => {
    it('Then the state should come from the last training', async () => {
      const { app, train } = await givenCatalogAndHistory()
      train('remada', '2026-11-02T10:00:00.000Z')
      train('remada', '2026-11-18T10:00:00.000Z')

      const back = groupOf(await getWindows(app), 'back')

      expect(back).toMatchObject({ state: 'open', lastTrainedAt: '2026-11-18T10:00:00.000Z' })
    })
  })
})

describe('Given two chest trainings at the same instant and goal, one with twice the volume', () => {
  describe('When GET /api/windows is called for each', () => {
    it('Then the window of the larger volume should open later', async () => {
      const light = await givenCatalogAndHistory()
      light.train('supino-reto', '2026-11-21T10:00:00.000Z', 40000)
      const heavy = await givenCatalogAndHistory()
      heavy.train('supino-reto', '2026-11-21T10:00:00.000Z', 80000)

      const opens = [light, heavy].map(
        async ({ app }) => groupOf(await getWindows(app), 'chest')?.opensAt,
      )

      const [lightOpensAt, heavyOpensAt] = await Promise.all(opens)
      expect(Date.parse(heavyOpensAt as string)).toBeGreaterThan(Date.parse(lightOpensAt as string))
    })
  })
})

describe('Given no session of access', () => {
  describe('When GET /api/windows is called without the session cookie', () => {
    it('Then should respond 401 unauthenticated with no groups', async () => {
      const db = createTestDatabase()
      const app = createApp({ nodeEnv: 'test', databaseHealth: () => true, db })

      const response = await app.request('/api/windows')
      const body = (await response.json()) as Record<string, unknown>

      expect({ status: response.status, code: body.code, hasGroups: 'groups' in body }).toEqual({
        status: 401,
        code: 'unauthenticated',
        hasGroups: false,
      })
    })
  })
})

describe('Given a database with no workout (US-F10-02)', () => {
  describe('When GET /api/levels is called', () => {
    it('Then should respond 200 with the 11 groups in catalog order at level 1, bronze, with an empty bar', async () => {
      const { app, clock } = createProgramTestApp()

      const response = await app.request('/api/levels')
      const body = (await response.json()) as MuscleGroupLevels

      expect({
        status: response.status,
        now: body.now,
        groups: body.groups.map(({ muscleGroup, level, points, levelCost, bestLevel, tier }) => [
          muscleGroup.slug,
          level,
          points,
          levelCost,
          bestLevel,
          tier,
        ]),
      }).toEqual({
        status: 200,
        now: clock.now().toISOString(),
        groups: CATALOG_ORDER.map((slug) => [slug, 1, 0, 40, 1, 'bronze']),
      })
    })
  })
})

describe('Given back trained with 3 sets in a workout with no letter left', () => {
  describe('When GET /api/levels is called', () => {
    it('Then back should be at level 2 with 20 points on a bar of 43', async () => {
      const { app, train } = await givenCatalogAndHistory()
      train('remada', '2026-11-21T09:00:00.000Z')

      const body = (await (await app.request('/api/levels')).json()) as MuscleGroupLevels

      expect(body.groups.find(({ muscleGroup }) => muscleGroup.slug === 'back')).toEqual({
        muscleGroup: { slug: 'back', name: 'costas' },
        level: 2,
        points: 20,
        levelCost: 43,
        bestLevel: 2,
        tier: 'bronze',
      })
    })
  })
})

describe('Given back trained twice, the second time inside the window of the first', () => {
  describe('When GET /api/levels is called', () => {
    it('Then the second workout should count double and take back to level 5, silver', async () => {
      const { app, train } = await givenCatalogAndHistory()
      train('remada', '2026-11-18T09:00:00.000Z')
      train('remada', '2026-11-21T09:00:00.000Z')

      const body = (await (await app.request('/api/levels')).json()) as MuscleGroupLevels

      expect(body.groups.find(({ muscleGroup }) => muscleGroup.slug === 'back')).toMatchObject({
        level: 5,
        points: 2,
        tier: 'silver',
      })
    })
  })
})
