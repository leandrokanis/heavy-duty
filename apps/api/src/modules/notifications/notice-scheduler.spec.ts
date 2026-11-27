import { describe, expect, it, vi } from 'vitest'
import type { Database } from '../../db/connection.js'
import { runSeed } from '../../db/seed.js'
import { createTestDatabase } from '../../test/database.js'
import { createFakeMailSender, type FakeMailSender } from '../../test/mail-sender.js'
import { createTestClock, type TestClock } from '../../test/programs.js'
import { createFakePushSender } from '../../test/push-sender.js'
import { recordWorkout } from '../../test/workouts.js'
import { addExercise } from '../catalog/exercise.service.js'
import { addMuscle } from '../catalog/muscle.service.js'
import { ensurePeriods } from '../periods/period.service.js'
import { addPlannedExercise, addProgramDay, createProgram } from '../programs/program.service.js'
import { createEmailChannel } from './email-channel.js'
import { turnEmailsOffByToken, unsubscribeTokenHashOf } from './email-opt-out.service.js'
import { isEmailEnabled, setEmailNotices } from './email-settings.service.js'
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
      groups: muscleGroupSlugs === null ? null : JSON.parse(muscleGroupSlugs),
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

const APP_ORIGIN = 'https://heavy.example.com'

function emailChannel(db: Database, sender: FakeMailSender) {
  return createEmailChannel(db, sender, { appOrigin: APP_ORIGIN, timeZone: SAO_PAULO })
}

function givenPhoneSubscribed(db: Database, clock: TestClock): void {
  savePushSubscription(db, { endpoint: PHONE, keys: { p256dh: 'BKey', auth: 'Auth' } }, clock.now())
}

describe('Given letter B closes tomorrow at 10h with the phone and the email on (US-F17-01)', () => {
  describe('When the tick runs at 21h of the evening before', () => {
    it('Then should send one push notice and one email of letter B, with the same title', async () => {
      const { db, clock } = givenLetterBTrained()
      givenPhoneSubscribed(db, clock)
      const push = createFakePushSender()
      const mail = createFakeMailSender()
      clock.advance(CLOSE_NOTICE_AT.getTime() - clock.now().getTime())

      await runNoticeTick(
        tickDeps(db, clock, [createPushChannel(db, push, SAO_PAULO), emailChannel(db, mail)]),
      )

      expect({
        push: push.sent.map(({ message }) => message.title),
        email: mail.sent.map(({ subject }) => subject),
      }).toEqual({
        push: ['Letra B fecha amanhã às 10h'],
        email: ['Letra B fecha amanhã às 10h'],
      })
    })

    it('Then should record the notice once per channel, both as sent', async () => {
      const { db, clock } = givenLetterBTrained()
      givenPhoneSubscribed(db, clock)
      clock.advance(CLOSE_NOTICE_AT.getTime() - clock.now().getTime())

      await runNoticeTick(
        tickDeps(db, clock, [
          createPushChannel(db, createFakePushSender(), SAO_PAULO),
          emailChannel(db, createFakeMailSender()),
        ]),
      )

      const rows = rowsOf(db)
        .map(({ kind, channel, letter, status }) => [channel, kind, letter, status])
        .sort()
      expect(rows).toEqual([
        ['email', 'window_close', 'B', 'sent'],
        ['push', 'window_close', 'B', 'sent'],
      ])
    })

    it('Then the email should list the groups of the letter and carry the link to turn the emails off', async () => {
      const { db, clock } = givenLetterBTrained()
      const mail = createFakeMailSender()
      clock.advance(CLOSE_NOTICE_AT.getTime() - clock.now().getTime())

      await runNoticeTick(tickDeps(db, clock, [emailChannel(db, mail)]))

      const email = mail.sent[0]
      expect([
        email?.text.includes('Costas · Bíceps'),
        email?.headers['List-Unsubscribe-Post'],
        email?.html.includes(`${APP_ORIGIN}/desligar-emails#token=`),
      ]).toEqual([true, 'List-Unsubscribe=One-Click', true])
    })
  })

  describe('When the SMTP server cannot deliver the email', () => {
    it('Then should still send the push notice and record the email as failed with the reason', async () => {
      const { db, clock } = givenLetterBTrained()
      givenPhoneSubscribed(db, clock)
      const push = createFakePushSender()
      clock.advance(CLOSE_NOTICE_AT.getTime() - clock.now().getTime())

      await runNoticeTick(
        tickDeps(db, clock, [
          emailChannel(db, createFakeMailSender('ECONNECTION')),
          createPushChannel(db, push, SAO_PAULO),
        ]),
      )

      const rows = rowsOf(db)
        .map(({ channel, status, error }) => [channel, status, error])
        .sort()
      expect({ pushSent: push.sent.length, rows }).toEqual({
        pushSent: 1,
        rows: [
          ['email', 'failed', 'ECONNECTION'],
          ['push', 'sent', null],
        ],
      })
    })
  })
})

function tokenOf(email: { headers: Record<string, string> } | undefined): string {
  const header = email?.headers['List-Unsubscribe'] ?? ''
  return new URL(header.slice(1, -1)).searchParams.get('token') ?? ''
}

describe('Given letter B closes tomorrow at 10h with the email on (US-F17-04)', () => {
  describe('When the tick sends the email', () => {
    it('Then the email should carry a token of 43 characters and the row only its SHA-256', async () => {
      const { db, clock } = givenLetterBTrained()
      const mail = createFakeMailSender()
      clock.advance(CLOSE_NOTICE_AT.getTime() - clock.now().getTime())

      await runNoticeTick(tickDeps(db, clock, [emailChannel(db, mail)]))

      const token = tokenOf(mail.sent[0])
      const row = listNotifications(db)[0]
      expect({
        tokenLength: token.length,
        pageLinkHasToken: mail.sent[0]?.html.includes(`/desligar-emails#token=${token}`),
        hash: row?.unsubscribeTokenHash,
      }).toEqual({ tokenLength: 43, pageLinkHasToken: true, hash: unsubscribeTokenHashOf(token) })
    })
  })

  describe('When the athlete turns the emails off with the token of that email', () => {
    it('Then the emails should be off', async () => {
      const { db, clock } = givenLetterBTrained()
      const mail = createFakeMailSender()
      clock.advance(CLOSE_NOTICE_AT.getTime() - clock.now().getTime())
      await runNoticeTick(tickDeps(db, clock, [emailChannel(db, mail)]))

      turnEmailsOffByToken(db, tokenOf(mail.sent[0]), clock.now())

      expect(isEmailEnabled(db)).toBe(false)
    })
  })
})

describe('Given letter B closes tomorrow at 10h and the emails turned off (US-F17-04)', () => {
  describe('When the tick runs at 21h of the evening before', () => {
    it('Then should send the push notice and record the email as skipped', async () => {
      const { db, clock } = givenLetterBTrained()
      givenPhoneSubscribed(db, clock)
      setEmailNotices(db, { enabled: false }, clock.now())
      const mail = createFakeMailSender()
      clock.advance(CLOSE_NOTICE_AT.getTime() - clock.now().getTime())

      await runNoticeTick(
        tickDeps(db, clock, [
          createPushChannel(db, createFakePushSender(), SAO_PAULO),
          emailChannel(db, mail),
        ]),
      )

      const rows = rowsOf(db)
        .map(({ channel, status, error }) => [channel, status, error])
        .sort()
      expect({ emailsSent: mail.sent.length, rows }).toEqual({
        emailsSent: 0,
        rows: [
          ['email', 'skipped', 'emails turned off'],
          ['push', 'sent', null],
        ],
      })
    })
  })
})

// Period 1 starts on Monday 2026-11-16 at 00:00 in São Paulo; its week 1 ends on Monday 2026-11-23
// at 00:00, and the digest of week 1 is due at 7h that day (D106).
const DIGEST_DUE_AT = new Date('2026-11-23T10:00:00.000Z')

function givenWeek1Ended(at: Date = DIGEST_DUE_AT) {
  const { db, clock } = givenLetterBTrained()
  ensurePeriods(db, clock.now(), SAO_PAULO)
  clock.advance(at.getTime() - clock.now().getTime())
  return { db, clock }
}

function digestRowsOf(db: Database) {
  return listNotifications(db)
    .filter(({ kind }) => kind === 'weekly_digest')
    .map(({ noticeKey, channel, letter, muscleGroupSlugs, eventAt, status, error }) => ({
      noticeKey,
      channel,
      letter,
      muscleGroupSlugs,
      eventAt,
      status,
      error,
    }))
}

describe('Given week 1 of the period ended, with the email channel (US-F17-03)', () => {
  describe('When a tick runs on Monday at 7h', () => {
    it('Then should send the digest of week 1 once, by email only, and record it', async () => {
      const { db, clock } = givenWeek1Ended()
      const mail = createFakeMailSender()
      const channels = [
        createPushChannel(db, createFakePushSender(), SAO_PAULO),
        emailChannel(db, mail),
      ]

      await runNoticeTick(tickDeps(db, clock, channels))
      await runNoticeTick(tickDeps(db, clock, channels))

      expect({
        subjects: mail.sent.map(({ subject }) => subject).filter((s) => s.startsWith('Sua semana')),
        rows: digestRowsOf(db),
      }).toEqual({
        subjects: ['Sua semana: 0 janelas aproveitadas'],
        rows: [
          {
            noticeKey: 'weekly_digest:2026-11-16T03:00:00.000Z',
            channel: 'email',
            letter: null,
            muscleGroupSlugs: null,
            eventAt: '2026-11-23T03:00:00.000Z',
            status: 'sent',
            error: null,
          },
        ],
      })
    })
  })

  describe('When the emails were turned off', () => {
    it('Then should record the digest as skipped and send nothing', async () => {
      const { db, clock } = givenWeek1Ended()
      setEmailNotices(db, { enabled: false }, clock.now())
      const mail = createFakeMailSender()

      await runNoticeTick(tickDeps(db, clock, [emailChannel(db, mail)]))

      expect({
        sent: mail.sent.length,
        rows: digestRowsOf(db).map(({ status }) => status),
      }).toEqual({ sent: 0, rows: ['skipped'] })
    })
  })

  describe('When only the push channel is configured', () => {
    it('Then should record no digest', async () => {
      const { db, clock } = givenWeek1Ended()

      await runNoticeTick(
        tickDeps(db, clock, [createPushChannel(db, createFakePushSender(), SAO_PAULO)]),
      )

      expect(digestRowsOf(db)).toEqual([])
    })
  })
})

describe('Given the server stopped on Monday at 7h (US-F17-03)', () => {
  describe('When it comes back at 20h', () => {
    it('Then should still send the digest of week 1', async () => {
      const { db, clock } = givenWeek1Ended(new Date('2026-11-23T23:00:00.000Z'))
      const mail = createFakeMailSender()

      await runNoticeTick(tickDeps(db, clock, [emailChannel(db, mail)]))

      expect(digestRowsOf(db).map(({ status }) => status)).toEqual(['sent'])
    })
  })

  describe('When it comes back on Tuesday at 7h, 24 h later', () => {
    it('Then should send no digest', async () => {
      const { db, clock } = givenWeek1Ended(new Date('2026-11-24T10:00:00.000Z'))
      const mail = createFakeMailSender()

      await runNoticeTick(tickDeps(db, clock, [emailChannel(db, mail)]))

      expect(digestRowsOf(db)).toEqual([])
    })
  })
})
