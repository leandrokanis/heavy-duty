import { describe, expect, it, vi } from 'vitest'
import type { Database } from '../../db/connection.js'
import { runSeed } from '../../db/seed.js'
import { createTestDatabase } from '../../test/database.js'
import { createTestClock, type TestClock } from '../../test/programs.js'
import { createFakePushSender } from '../../test/push-sender.js'
import { recordWorkout } from '../../test/workouts.js'
import { addExercise } from '../catalog/exercise.service.js'
import { addMuscle } from '../catalog/muscle.service.js'
import { addPlannedExercise, addProgramDay, createProgram } from '../programs/program.service.js'
import {
  createPushChannel,
  type NoticeChannel,
  runNoticeTick,
  startNoticeScheduler,
} from './notice-scheduler.js'
import { listNotifications } from './notification.repository.js'
import { savePushSubscription } from './push-subscription.service.js'

const SAO_PAULO = 'America/Sao_Paulo'
const PHONE = 'https://push.example.test/send/phone'
// Letter B trained at 10h of 2026-11-18 in São Paulo: back and biceps close 120 h later, at 10h of
// 2026-11-23; 12 h before is 22h, in the quiet hours, so the notice goes out at 21h of 2026-11-22.
const TRAINED_AT = '2026-11-18T13:00:00.000Z'
const CLOSE_NOTICE_AT = new Date('2026-11-23T00:00:00.000Z')

function givenLetterBTrained(): { db: Database; clock: TestClock } {
  const db = createTestDatabase()
  runSeed(db)
  const clock = createTestClock(new Date(TRAINED_AT))
  addMuscle(db, { name: 'grande dorsal', muscleGroupSlug: 'back' })
  addMuscle(db, { name: 'bíceps braquial', muscleGroupSlug: 'biceps' })
  addExercise(db, { name: 'Remada', kind: 'reps', primaryMuscleSlugs: ['grande-dorsal'] })
  addExercise(db, { name: 'Rosca', kind: 'reps', primaryMuscleSlugs: ['biceps-braquial'] })
  const { id: programId } = createProgram(
    db,
    { name: 'Programa', goal: 'hypertrophy' },
    clock.now(),
  )
  addProgramDay(db, programId, { letter: 'B' }, clock.now())
  for (const exerciseSlug of ['remada', 'rosca']) {
    addPlannedExercise(
      db,
      programId,
      'B',
      { exerciseSlug, sets: 3, targetReps: 10, loadG: 20000, restSeconds: 90 },
      clock.now(),
    )
  }
  const train = (startedAt: string) =>
    recordWorkout(
      db,
      {
        programId,
        letter: 'B',
        startedAt,
        sets: ['remada', 'rosca'].flatMap((exerciseSlug) =>
          Array.from({ length: 3 }, () => ({ exerciseSlug, loadG: 20000, reps: 10 })),
        ),
      },
      clock.now(),
    )
  train(TRAINED_AT)
  return { db, clock }
}

function tickDeps(db: Database, clock: TestClock, channels: NoticeChannel[]) {
  return { db, now: clock.now, timeZone: SAO_PAULO, channels, log: { error: vi.fn() } }
}

function rowsOf(db: Database) {
  return listNotifications(db).map(
    ({ kind, channel, letter, muscleGroupSlugs, eventAt, status, error }) => ({
      kind,
      channel,
      letter,
      groups: JSON.parse(muscleGroupSlugs),
      eventAt,
      status,
      error,
    }),
  )
}

describe('Given letter B closes tomorrow at 10h and the phone turned the notices on', () => {
  describe('When the tick runs at 21h of the evening before', () => {
    it('Then should send one closing notice of letter B by push and record it as sent', async () => {
      const { db, clock } = givenLetterBTrained()
      savePushSubscription(
        db,
        { endpoint: PHONE, keys: { p256dh: 'BKey', auth: 'Auth' } },
        clock.now(),
      )
      const sender = createFakePushSender()
      clock.advance(CLOSE_NOTICE_AT.getTime() - clock.now().getTime())

      await runNoticeTick(tickDeps(db, clock, [createPushChannel(db, sender, SAO_PAULO)]))

      expect({
        rows: rowsOf(db),
        titles: sender.sent.map(({ message }) => message.title),
      }).toEqual({
        rows: [
          {
            kind: 'window_close',
            channel: 'push',
            letter: 'B',
            groups: ['back', 'biceps'],
            eventAt: '2026-11-23T13:00:00.000Z',
            status: 'sent',
            error: null,
          },
        ],
        titles: ['Letra B fecha amanhã às 10h'],
      })
    })
  })

  describe('When the tick runs again a minute later', () => {
    it('Then should not send the same notice twice', async () => {
      const { db, clock } = givenLetterBTrained()
      savePushSubscription(
        db,
        { endpoint: PHONE, keys: { p256dh: 'BKey', auth: 'Auth' } },
        clock.now(),
      )
      const sender = createFakePushSender()
      const deps = tickDeps(db, clock, [createPushChannel(db, sender, SAO_PAULO)])
      clock.advance(CLOSE_NOTICE_AT.getTime() - clock.now().getTime())

      await runNoticeTick(deps)
      clock.advance(60_000)
      await runNoticeTick(deps)

      expect([sender.sent.length, listNotifications(db).length]).toEqual([1, 1])
    })
  })
})

describe('Given letter B closes tomorrow at 10h and no phone turned the notices on', () => {
  describe('When the tick runs at 21h of the evening before', () => {
    it('Then should record the push notice as skipped', async () => {
      const { db, clock } = givenLetterBTrained()
      clock.advance(CLOSE_NOTICE_AT.getTime() - clock.now().getTime())

      await runNoticeTick(
        tickDeps(db, clock, [createPushChannel(db, createFakePushSender(), SAO_PAULO)]),
      )

      expect(rowsOf(db).map(({ status, error }) => [status, error])).toEqual([
        ['skipped', 'no push subscription'],
      ])
    })
  })
})

describe('Given two channels and the first throws', () => {
  describe('When the tick runs at the time of a notice', () => {
    it('Then should record the first as failed and still deliver by the second', async () => {
      const { db, clock } = givenLetterBTrained()
      clock.advance(CLOSE_NOTICE_AT.getTime() - clock.now().getTime())
      const broken: NoticeChannel = {
        name: 'push',
        deliver: async () => {
          throw new Error('connection reset')
        },
      }
      const other: NoticeChannel = {
        name: 'email',
        deliver: vi.fn(async () => ({ status: 'sent' as const, error: null })),
      }

      await runNoticeTick(tickDeps(db, clock, [broken, other]))

      // Both rows share the millisecond of the tick, so their UUID v7 order is random.
      const rows = rowsOf(db)
        .map(({ channel, status, error }) => [channel, status, error])
        .sort()
      expect(rows).toEqual([
        ['email', 'sent', null],
        ['push', 'failed', 'channel failed: connection reset'],
      ])
    })
  })
})

describe('Given the athlete trained letter B again inside its window', () => {
  describe('When the tick runs at the time the closing notice would go out', () => {
    it('Then should send no closing notice, only the opening of the new window', async () => {
      const { db, clock } = givenLetterBTrained()
      const sender = createFakePushSender()
      savePushSubscription(
        db,
        { endpoint: PHONE, keys: { p256dh: 'BKey', auth: 'Auth' } },
        clock.now(),
      )
      recordWorkoutAgain(db, clock)
      clock.advance(CLOSE_NOTICE_AT.getTime() - clock.now().getTime())

      await runNoticeTick(tickDeps(db, clock, [createPushChannel(db, sender, SAO_PAULO)]))

      expect(sender.sent.map(({ message }) => message.title)).toEqual([
        'Letra B abre amanhã às 13h20',
      ])
    })
  })
})

describe('Given the scheduler starts', () => {
  describe('When it is stopped', () => {
    it('Then should have run a first tick at once and wait for it', async () => {
      const { db, clock } = givenLetterBTrained()
      clock.advance(CLOSE_NOTICE_AT.getTime() - clock.now().getTime())

      const scheduler = startNoticeScheduler({
        ...tickDeps(db, clock, [createPushChannel(db, createFakePushSender(), SAO_PAULO)]),
        intervalMs: 3_600_000,
      })
      await scheduler.stop()

      expect(listNotifications(db).length).toBe(1)
    })
  })
})

// Letter B again at 10h of 2026-11-22, inside the window opened on 2026-11-20.
function recordWorkoutAgain(db: Database, clock: TestClock) {
  const program = db.$client.prepare('SELECT id FROM programs LIMIT 1').get() as { id: string }
  recordWorkout(
    db,
    {
      programId: program.id,
      letter: 'B',
      startedAt: '2026-11-22T13:00:00.000Z',
      sets: ['remada', 'rosca'].map((exerciseSlug) => ({ exerciseSlug, loadG: 20000, reps: 10 })),
    },
    clock.now(),
  )
}
