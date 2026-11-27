import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Database } from '../../db/connection.js'
import { createTestDatabase } from '../../test/database.js'
import { createProgramTestApp, createTestClock } from '../../test/programs.js'
import { recordWorkout } from '../../test/workouts.js'
import { listMedalAwards } from '../medals/medal.repository.js'
import { runGameTick, startGameScheduler } from './game-scheduler.js'
import { listPeriods } from './period.repository.js'

const SAO_PAULO = 'America/Sao_Paulo'
const quietLog = () => ({ error: vi.fn() })

afterEach(() => {
  vi.useRealTimers()
})

describe('Given the first start of the API with the migration of the periods', () => {
  describe('When the game scheduler starts', () => {
    it('Then should store period 1 at once, with no channel of notices', async () => {
      const db = createTestDatabase()
      const clock = createTestClock(new Date('2026-11-25T13:00:00.000Z'))

      const scheduler = startGameScheduler({
        db,
        now: clock.now,
        timeZone: SAO_PAULO,
        log: quietLog(),
      })
      await scheduler.stop()

      expect(listPeriods(db).map(({ number, startsAt }) => [number, startsAt])).toEqual([
        [1, '2026-11-23T03:00:00.000Z'],
      ])
    })
  })
})

describe('Given the game scheduler running at the end of period 1', () => {
  describe('When a tick runs after the end', () => {
    it('Then should open period 2', async () => {
      vi.useFakeTimers()
      const db = createTestDatabase()
      const clock = createTestClock(new Date('2027-02-15T02:59:30.000Z'))
      await runGameTick({
        db,
        now: () => new Date('2026-11-25T13:00:00.000Z'),
        timeZone: SAO_PAULO,
        log: quietLog(),
      })
      const scheduler = startGameScheduler({
        db,
        now: clock.now,
        timeZone: SAO_PAULO,
        log: quietLog(),
        intervalMs: 60_000,
      })

      clock.advance(60_000)
      await vi.advanceTimersByTimeAsync(60_000)
      await scheduler.stop()

      expect(listPeriods(db).map(({ number }) => number)).toEqual([1, 2])
    })
  })
})

describe('Given period 1 ended with the server running (US-F11-02)', () => {
  describe('When a tick runs after the end', () => {
    it('Then should freeze the snapshot of period 1', async () => {
      const db = createTestDatabase()
      await runGameTick({
        db,
        now: () => new Date('2026-11-25T13:00:00.000Z'),
        timeZone: SAO_PAULO,
        log: quietLog(),
      })

      await runGameTick({
        db,
        now: () => new Date('2027-02-15T03:00:30.000Z'),
        timeZone: SAO_PAULO,
        log: quietLog(),
      })

      expect(listPeriods(db).map(({ number, frozenAt }) => [number, frozenAt])).toEqual([
        [1, '2027-02-15T03:00:30.000Z'],
        [2, null],
      ])
    })
  })
})

describe('Given a database that fails', () => {
  describe('When a tick runs', () => {
    it('Then should log the error and not throw', async () => {
      const log = quietLog()
      const broken = {
        select: () => {
          throw new Error('database is locked')
        },
      } as unknown as Database

      await runGameTick({ db: broken, now: () => new Date(), timeZone: SAO_PAULO, log })

      expect(log.error).toHaveBeenCalledWith(
        'game: could not ensure the current period and freeze the ended ones: database is locked',
      )
    })
  })
})

describe('Given a first record in period 1 that no read of the app saw (US-F19-01)', () => {
  describe('When a tick of the game scheduler runs', () => {
    it('Then should store the medal with the instant of the record', async () => {
      const { db, clock, app } = createProgramTestApp()
      const created = await app.request('/api/programs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Programa 1', goal: 'hypertrophy' }),
      })
      const programId = ((await created.json()) as { id: string }).id
      for (const [startedAt, loadG] of [
        ['2026-11-17T10:00:00.000Z', 40_000],
        ['2026-11-19T10:00:00.000Z', 42_000],
      ] as const) {
        recordWorkout(
          db,
          {
            programId,
            letter: 'A',
            startedAt,
            sets: [{ exerciseSlug: 'supino-reto', loadG, reps: 10 }],
          },
          clock.now(),
        )
      }

      await runGameTick({ db, now: clock.now, timeZone: SAO_PAULO, log: quietLog() })

      expect(
        listMedalAwards(db)
          .filter(({ medalCode }) => medalCode === 'first_record')
          .map(({ medalCode, awardedAt }) => [medalCode, awardedAt]),
      ).toEqual([['first_record', '2026-11-19T10:00:00.000Z']])
    })
  })
})
