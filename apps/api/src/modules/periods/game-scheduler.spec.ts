import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Database } from '../../db/connection.js'
import { createTestDatabase } from '../../test/database.js'
import { createTestClock } from '../../test/programs.js'
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
        'game: could not ensure the current period: database is locked',
      )
    })
  })
})
