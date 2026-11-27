import { describe, expect, it } from 'vitest'
import { getWeeklyDigest } from '../../modules/notifications/weekly-digest.service.js'
import { createProgramTestApp } from '../../test/programs.js'
import { recordWorkout } from '../../test/workouts.js'

type App = ReturnType<typeof createProgramTestApp>['app']

async function callTool(app: App, name: string, args: Record<string, unknown> = {}) {
  const response = await app.request('/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name, arguments: args },
    }),
  })
  return (
    (await response.json()) as {
      result?: {
        structuredContent?: Record<string, unknown>
        isError?: boolean
        content?: { text: string }[]
      }
    }
  ).result
}

// The clock of the test app starts on Saturday 2026-11-21 at 10:00Z: period 1 starts on Monday
// 2026-11-16 at 03:00Z, and its week 1 ends on Monday 2026-11-23 at 03:00Z.
async function givenWeek1WithARecordAndAWindow() {
  const testApp = createProgramTestApp()
  const created = await testApp.app.request('/api/programs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Programa 1', goal: 'hypertrophy' }),
  })
  const programId = ((await created.json()) as { id: string }).id
  for (const [startedAt, loadG] of [
    ['2026-11-10T10:00:00.000Z', 40_000],
    ['2026-11-17T10:00:00.000Z', 42_000],
    ['2026-11-19T10:00:00.000Z', 42_000],
  ] as const) {
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
  }
  await testApp.app.request('/api/medals')
  return testApp
}

const MONDAY_AT_7H = new Date('2026-11-23T10:00:00.000Z')

describe('Given week 1 with a bench record and chest trained in its window (US-F17-03)', () => {
  describe('When the digest is read on Monday at 7h with no week', () => {
    it('Then should show the digest of week 1: the window, the record by name and the two medals', async () => {
      const { db } = await givenWeek1WithARecordAndAWindow()

      const digest = getWeeklyDigest(db, {}, MONDAY_AT_7H)

      expect(digest).toMatchObject({
        weekStartsAt: '2026-11-16T03:00:00.000Z',
        weekEndsAt: '2026-11-23T03:00:00.000Z',
        ended: true,
        subject: 'Sua semana: 1 janela aproveitada',
        weeklyGoal: null,
        windowsUsed: 1,
        windowsMissed: 0,
        weekStreak: 0,
        records: ['Supino reto'],
        medals: ['Primeiro recorde', 'Primeira janela'],
      })
    })

    it('Then should list chest among the levels that went up, and the points of the week', async () => {
      const { db } = await givenWeek1WithARecordAndAWindow()

      const digest = getWeeklyDigest(db, {}, MONDAY_AT_7H)

      const chest = digest.levels.find(({ muscleGroup }) => muscleGroup.slug === 'chest')
      expect({
        up: chest !== undefined && chest.to > chest.from,
        points: digest.weekPoints > 0,
      }).toEqual({ up: true, points: true })
    })
  })

  describe('When get_weekly_digest is called on Saturday with an instant of week 1', () => {
    it('Then should show week 1 still going, the same as the service', async () => {
      const { app, db, clock } = await givenWeek1WithARecordAndAWindow()

      const result = await callTool(app, 'get_weekly_digest', { at: '2026-11-18T12:00:00.000Z' })

      expect(result?.structuredContent).toEqual({
        ...getWeeklyDigest(db, { at: '2026-11-18T12:00:00.000Z' }, clock.now()),
        ended: false,
      })
    })
  })

  describe('When get_weekly_digest is called with an instant before period 1', () => {
    it('Then should refuse it with weekly_digest_week_invalid', async () => {
      const { app } = await givenWeek1WithARecordAndAWindow()

      const result = await callTool(app, 'get_weekly_digest', { at: '2026-11-10T10:00:00.000Z' })

      expect({
        isError: result?.isError,
        code: JSON.parse(result?.content?.[0]?.text ?? '{}').code,
      }).toEqual({ isError: true, code: 'weekly_digest_week_invalid' })
    })
  })
})
