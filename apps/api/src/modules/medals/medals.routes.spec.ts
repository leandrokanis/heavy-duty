import { describe, expect, it } from 'vitest'
import { createProgramTestApp } from '../../test/programs.js'
import { recordWorkout } from '../../test/workouts.js'
import { deleteWorkoutById } from '../workouts/workout-removal.service.js'
import type { Medals } from './medals.schemas.js'

// The clock of the test app starts on Saturday 2026-11-21 at 10:00Z: period 1 starts on Monday
// 2026-11-16 at 03:00Z.
async function givenProgram() {
  const testApp = createProgramTestApp()
  const created = await testApp.app.request('/api/programs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Programa 1', goal: 'hypertrophy' }),
  })
  const programId = ((await created.json()) as { id: string }).id
  const bench = (startedAt: string, loadG: number) =>
    recordWorkout(
      testApp.db,
      {
        programId,
        letter: 'A',
        startedAt,
        sets: [{ exerciseSlug: 'supino-reto', loadG, reps: 10 }],
      },
      testApp.clock.now(),
    )
  return { ...testApp, bench }
}

async function medalsOf(app: ReturnType<typeof createProgramTestApp>['app']) {
  const response = await app.request('/api/medals')
  return { status: response.status, body: (await response.json()) as Medals }
}

const firstRecordOf = (body: Medals) => body.medals.find(({ code }) => code === 'first_record')

describe('Given no workout (US-F19-01)', () => {
  describe('When GET /api/medals is called', () => {
    it('Then should respond 200 with the 10 medals, none awarded, the hidden ones with no name', async () => {
      const { app, clock } = createProgramTestApp()

      const { status, body } = await medalsOf(app)

      expect({
        status,
        now: body.now,
        medals: body.medals.map(({ code, name, awardedAt }) => [code, name !== null, awardedAt]),
      }).toEqual({
        status: 200,
        now: clock.now().toISOString(),
        medals: [
          ['first_record', true, null],
          ['first_window', true, null],
          ['weekly_goal', true, null],
          ['week_streak_4', true, null],
          ['level_10', true, null],
          ['level_20', true, null],
          ['volume_up_20', true, null],
          ['full_period', true, null],
          ['all_letters_in_week', false, null],
          ['window_saved_at_end', false, null],
        ],
      })
    })
  })
})

describe('Given a bench of 40 kg × 10 and, two days later in period 1, 42 kg × 10', () => {
  describe('When GET /api/medals is called', () => {
    it('Then should award the first record at the set of 42 kg, with its workout', async () => {
      const { app, bench } = await givenProgram()
      bench('2026-11-17T10:00:00.000Z', 40_000)
      const second = bench('2026-11-19T10:00:00.000Z', 42_000)

      const { body } = await medalsOf(app)

      expect(firstRecordOf(body)).toMatchObject({
        awardedAt: '2026-11-19T10:00:00.000Z',
        workoutId: second,
        subject: null,
      })
    })
  })

  describe('When the workout of the record is removed', () => {
    it('Then the medal should stay, with no workout', async () => {
      const { app, db, bench } = await givenProgram()
      bench('2026-11-17T10:00:00.000Z', 40_000)
      const second = bench('2026-11-19T10:00:00.000Z', 42_000)
      await medalsOf(app)

      deleteWorkoutById(db, second)
      const { body } = await medalsOf(app)

      expect(firstRecordOf(body)).toMatchObject({
        awardedAt: '2026-11-19T10:00:00.000Z',
        workoutId: null,
      })
    })
  })
})

describe('Given a record before period 1 only', () => {
  describe('When GET /api/medals is called', () => {
    it('Then should not award the first record (D97)', async () => {
      const { app, bench } = await givenProgram()
      bench('2026-11-10T10:00:00.000Z', 40_000)
      bench('2026-11-12T10:00:00.000Z', 42_000)

      const { body } = await medalsOf(app)

      expect(firstRecordOf(body)?.awardedAt).toBeNull()
    })
  })
})
