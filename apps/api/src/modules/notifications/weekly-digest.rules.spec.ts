import { describe, expect, it } from 'vitest'
import {
  type DigestInput,
  type DigestSet,
  dueWeeklyDigestOf,
  weeklyDigestOf,
} from './weekly-digest.rules.js'

const SAO_PAULO = 'America/Sao_Paulo'
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const WEEK_MS = 7 * DAY_MS
// Monday 00:00 in São Paulo: the week ends on the next Monday 00:00.
const WEEK_1_MS = Date.parse('2026-11-30T03:00:00.000Z')
const WEEK_2_MS = WEEK_1_MS + WEEK_MS
const weeks = [
  { startsAtMs: WEEK_1_MS, endsAtMs: WEEK_2_MS },
  { startsAtMs: WEEK_2_MS, endsAtMs: WEEK_2_MS + WEEK_MS },
]
const iso = (ms: number) => new Date(ms).toISOString()
const at = (isoText: string) => Date.parse(isoText)

describe('Given week 1 ended on Monday 00:00 in São Paulo', () => {
  const dueOf = (nowIso: string) =>
    dueWeeklyDigestOf({ weeks, nowMs: at(nowIso), timeZone: SAO_PAULO })

  describe('When it is Monday 6h59', () => {
    it('Then no digest should be due', () => {
      expect(dueOf('2026-12-07T09:59:00.000Z')).toBeNull()
    })
  })

  describe('When it is Monday 7h', () => {
    it('Then the digest of week 1 should be due, keyed by the start of the week', () => {
      const due = dueOf('2026-12-07T10:00:00.000Z')
      expect(due && { ...due, dueAt: iso(due.dueAtMs) }).toEqual({
        key: 'weekly_digest:2026-11-30T03:00:00.000Z',
        weekStartsAtMs: WEEK_1_MS,
        weekEndsAtMs: WEEK_2_MS,
        dueAtMs: at('2026-12-07T10:00:00.000Z'),
        dueAt: '2026-12-07T10:00:00.000Z',
      })
    })
  })

  describe('When the server comes back on Monday 20h', () => {
    it('Then the digest of week 1 should still be due', () => {
      expect(dueOf('2026-12-07T23:00:00.000Z')?.weekStartsAtMs).toBe(WEEK_1_MS)
    })
  })

  describe('When the server comes back on Monday 22h, in the quiet hours', () => {
    it('Then no digest should be due (D80)', () => {
      expect(dueOf('2026-12-08T01:00:00.000Z')).toBeNull()
    })
  })

  describe('When the server comes back on Tuesday 7h, 24 h after', () => {
    it('Then the digest of week 1 should no longer be due', () => {
      expect(dueOf('2026-12-08T10:00:00.000Z')).toBeNull()
    })
  })

  describe('When week 2 is still going on Friday', () => {
    it('Then no digest should be due', () => {
      expect(dueOf('2026-12-11T15:00:00.000Z')).toBeNull()
    })
  })
})

const benchSet = (performedAtMs: number, loadG: number, workoutId = 'w'): DigestSet => ({
  workoutId,
  exerciseId: 'bench',
  exerciseName: 'Supino reto',
  performedAtMs,
  loadG,
  reps: 10,
})

const input = (params: Partial<DigestInput> = {}): DigestInput => ({
  week: weeks[0] as DigestInput['week'],
  weeklyGoal: 5,
  windowsUsed: 3,
  windowsMissed: 1,
  weekPoints: 420,
  weekStreak: 2,
  levels: [],
  sets: [],
  medals: [],
  ...params,
})

describe('Given a week with 3 windows used of a goal of 5', () => {
  describe('When the digest is made', () => {
    it('Then it should carry the windows, the goal, the points and the streak', () => {
      expect(weeklyDigestOf(input())).toMatchObject({
        weekStartsAtMs: WEEK_1_MS,
        weekEndsAtMs: WEEK_2_MS,
        windowsUsed: 3,
        windowsMissed: 1,
        weeklyGoal: 5,
        weekPoints: 420,
        weekStreak: 2,
      })
    })
  })
})

describe('Given chest went from level 7 to 8 in the week, and back stayed at 5', () => {
  describe('When the digest is made', () => {
    it('Then it should list only the level of chest', () => {
      const digest = weeklyDigestOf(
        input({
          levels: [
            { slug: 'chest', name: 'peito', levelAtStart: 7, levelAtEnd: 8 },
            { slug: 'back', name: 'costas', levelAtStart: 5, levelAtEnd: 5 },
          ],
        }),
      )
      expect(digest.levels).toEqual([{ slug: 'chest', name: 'peito', from: 7, to: 8 }])
    })
  })
})

describe('Given a bench record in the week, after a bench of 50 kg × 10 the week before', () => {
  describe('When the digest is made', () => {
    it('Then it should list the bench by its name only, once', () => {
      const digest = weeklyDigestOf(
        input({
          sets: [
            benchSet(WEEK_1_MS - DAY_MS, 50_000),
            benchSet(WEEK_1_MS + DAY_MS, 52_000),
            benchSet(WEEK_1_MS + 3 * DAY_MS, 54_000),
            {
              ...benchSet(WEEK_1_MS + 3 * DAY_MS, 0),
              exerciseId: 'plank',
              exerciseName: 'Prancha',
              reps: null,
            },
          ],
        }),
      )
      expect(digest.records).toEqual(['Supino reto'])
    })
  })

  describe('When the record came only in the next week', () => {
    it('Then it should list no record', () => {
      const digest = weeklyDigestOf(
        input({
          sets: [benchSet(WEEK_1_MS - DAY_MS, 50_000), benchSet(WEEK_2_MS + DAY_MS, 52_000)],
        }),
      )
      expect(digest.records).toEqual([])
    })
  })
})

describe('Given a medal awarded in the week and another the week before', () => {
  describe('When the digest is made', () => {
    it('Then it should list only the medal of the week', () => {
      const digest = weeklyDigestOf(
        input({
          medals: [
            { name: 'Primeira janela', awardedAtMs: WEEK_1_MS - HOUR_MS },
            { name: 'Primeiro recorde', awardedAtMs: WEEK_1_MS + DAY_MS },
          ],
        }),
      )
      expect(digest.medals).toEqual(['Primeiro recorde'])
    })
  })
})
