import { describe, expect, it } from 'vitest'
import { createApp } from '../../app.js'
import { createTestDatabase } from '../../test/database.js'
import { createProgramTestApp } from '../../test/programs.js'
import { recordWorkout } from '../../test/workouts.js'
import { addExercise } from '../catalog/exercise.service.js'
import { addMuscle } from '../catalog/muscle.service.js'
import type { CurrentPeriod } from './periods.schemas.js'

const DAY_MS = 24 * 60 * 60 * 1000

// The clock of the test app starts on Saturday 2026-11-21T10:00:00.000Z, in the week that starts
// on Monday 2026-11-16 at 00:00 in São Paulo (03:00Z).
async function givenBackHistory() {
  const testApp = createProgramTestApp()
  const { app, db } = testApp
  addMuscle(db, { name: 'grande dorsal', muscleGroupSlug: 'back' })
  addExercise(db, { name: 'Remada', kind: 'reps', primaryMuscleSlugs: ['grande-dorsal'] })
  const created = await app.request('/api/programs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Programa 1', goal: 'hypertrophy' }),
  })
  const programId = ((await created.json()) as { id: string }).id
  const train = (startedAt: string) =>
    recordWorkout(
      db,
      {
        programId,
        letter: 'A',
        startedAt,
        sets: Array.from({ length: 3 }, () => ({
          exerciseSlug: 'remada',
          loadG: 40000,
          reps: 10,
        })),
      },
      testApp.clock.now(),
    )
  return { ...testApp, train }
}

type Requester = { request: (path: string, init?: RequestInit) => Response | Promise<Response> }

async function getPeriod(app: Requester) {
  return (await (await app.request('/api/periods/current')).json()) as CurrentPeriod
}

function putIntention(app: Requester, body: unknown) {
  return app.request('/api/periods/current/intention', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const backOf = (period: CurrentPeriod) =>
  period.groups.find(({ muscleGroup }) => muscleGroup.slug === 'back')

describe('Given the first read of the period with no workout', () => {
  describe('When GET /api/periods/current is called', () => {
    it('Then should respond with period 1 from the Monday of the week, week 1 of 12, empty goals', async () => {
      const { app, clock } = createProgramTestApp()

      const response = await app.request('/api/periods/current')
      const body = (await response.json()) as CurrentPeriod

      expect({ status: response.status, ...body, groups: body.groups.length }).toEqual({
        status: 200,
        now: clock.now().toISOString(),
        number: 1,
        startsAt: '2026-11-16T03:00:00.000Z',
        endsAt: '2027-02-08T03:00:00.000Z',
        week: 1,
        weekCount: 12,
        intention: null,
        windows: { windowsUsed: 0, windowsMissed: 0, usedPercent: null, targetPercent: 70 },
        volume: {
          baselineVolumeG: null,
          lastWeekVolumeG: null,
          changePercent: null,
          targetPercent: 20,
        },
        groups: 11,
      })
    })
  })
})

describe('Given no session of access', () => {
  describe('When GET /api/periods/current is called', () => {
    it('Then should respond 401 with no period', async () => {
      const app = createApp({
        nodeEnv: 'test',
        databaseHealth: () => true,
        db: createTestDatabase(),
      })

      const response = await app.request('/api/periods/current')

      expect(response.status).toBe(401)
    })
  })
})

describe('Given back trained twice in week 1, the second time in the window of the first', () => {
  describe('When GET /api/periods/current is called in week 3', () => {
    it('Then back should have 1 window used and 2 missed in the period, and the volume the change of week 2 against week 1', async () => {
      const { app, clock, train } = await givenBackHistory()
      await getPeriod(app)
      train('2026-11-16T10:00:00.000Z')
      train('2026-11-18T10:00:00.000Z')
      train('2026-11-24T10:00:00.000Z')
      clock.advance(10 * DAY_MS)

      const period = await getPeriod(app)

      expect({ week: period.week, back: backOf(period), volume: period.volume }).toEqual({
        week: 3,
        back: {
          muscleGroup: { slug: 'back', name: 'costas' },
          windowsUsed: 1,
          windowsMissed: 2,
          usedPercent: 33,
        },
        volume: {
          baselineVolumeG: 2_400_000,
          lastWeekVolumeG: 1_200_000,
          changePercent: -50,
          targetPercent: 20,
        },
      })
    })
  })
})

describe('Given the current period with no intention', () => {
  describe('When the athlete writes the intention', () => {
    it('Then the period should show it, trimmed', async () => {
      const { app } = createProgramTestApp()

      const response = await putIntention(app, {
        intention: '  Treinar três vezes\npor semana.  ',
      })

      expect({
        status: response.status,
        put: ((await response.json()) as CurrentPeriod).intention,
        get: (await getPeriod(app)).intention,
      }).toEqual({
        status: 200,
        put: 'Treinar três vezes por semana.',
        get: 'Treinar três vezes por semana.',
      })
    })
  })

  describe('When the intention has 120 characters with emoji', () => {
    it('Then should save it', async () => {
      const { app } = createProgramTestApp()

      const response = await putIntention(app, { intention: '💪'.repeat(120) })

      expect(response.status).toBe(200)
    })
  })

  describe('When the intention has 121 characters', () => {
    it('Then should respond 400 period_intention_too_long and keep none', async () => {
      const { app } = createProgramTestApp()

      const response = await putIntention(app, { intention: 'a'.repeat(121) })

      expect({
        status: response.status,
        body: await response.json(),
        intention: (await getPeriod(app)).intention,
      }).toEqual({
        status: 400,
        body: {
          code: 'period_intention_too_long',
          message: 'a frase de intenção deve ter até 120 caracteres',
        },
        intention: null,
      })
    })
  })

  describe('When the body has no intention', () => {
    it('Then should respond 400 period_intention_required', async () => {
      const { app } = createProgramTestApp()

      const response = await putIntention(app, {})

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 400,
        body: { code: 'period_intention_required', message: 'informe a frase de intenção' },
      })
    })
  })
})

describe('Given the current period has an intention', () => {
  describe('When the athlete writes an empty intention', () => {
    it('Then the period should have no intention', async () => {
      const { app } = createProgramTestApp()
      await putIntention(app, { intention: 'Treinar três vezes por semana.' })

      await putIntention(app, { intention: '   ' })

      expect((await getPeriod(app)).intention).toBeNull()
    })
  })
})
