import { describe, expect, it } from 'vitest'
import { GAME_PARAMETERS } from '../windows/windows.config.js'
import { MEDAL_CATALOG } from './medals.catalog.js'
import {
  type LevelStep,
  type MedalAward,
  type MedalHistory,
  type MedalSet,
  type MedalWeek,
  type MedalWorkout,
  medalAwardsOf,
} from './medals.rules.js'

// Period 1 starts on Monday 00:00 in São Paulo. With no volume, a hypertrophy window opens 24 h
// and closes 120 h after the training.
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const WEEK_MS = 7 * DAY_MS
const PERIOD_MS = 12 * WEEK_MS
const START_MS = Date.parse('2026-11-30T03:00:00.000Z')
const at = (days: number, hours = 10) => START_MS + days * DAY_MS + hours * HOUR_MS
const iso = (ms: number) => new Date(ms).toISOString()

const set = (params: Partial<MedalSet> & Pick<MedalSet, 'workoutId' | 'performedAtMs'>) => ({
  exerciseId: 'bench',
  letter: 'A',
  goal: 'hypertrophy' as const,
  loadG: 0,
  reps: 10,
  seconds: null,
  primaryGroupSlugs: ['peito'],
  secondaryGroupSlugs: [],
  ...params,
})

const weeksOf = (count: number, params: Partial<MedalWeek> = {}): MedalWeek[] =>
  Array.from({ length: count }, (_, index) => ({
    startsAtMs: START_MS + index * WEEK_MS,
    endsAtMs: START_MS + (index + 1) * WEEK_MS,
    weeklyGoal: null,
    weekStreak: 0,
    ...params,
  }))

const workoutsOf = (sets: MedalSet[], programId = 'p1'): MedalWorkout[] => {
  const workouts = new Map<string, MedalWorkout>()
  for (const item of sets) {
    const current = workouts.get(item.workoutId)
    if (!current || item.performedAtMs < current.startedAtMs) {
      workouts.set(item.workoutId, {
        id: item.workoutId,
        programId,
        letter: item.letter,
        startedAtMs: item.performedAtMs,
      })
    }
  }
  return [...workouts.values()]
}

const awardsOf = (history: Partial<MedalHistory>): MedalAward[] => {
  const sets = history.sets ?? []
  return medalAwardsOf({
    sets,
    workouts: workoutsOf(sets),
    levelSteps: [],
    periods: [{ number: 1, startsAtMs: START_MS, endsAtMs: START_MS + PERIOD_MS }],
    weeks: weeksOf(12),
    activeProgram: null,
    parameters: GAME_PARAMETERS,
    nowMs: START_MS + PERIOD_MS,
    ...history,
  })
}

const award = (awards: MedalAward[], code: string) => {
  const found = awards.find((item) => item.code === code)
  return found && { ...found, awardedAt: iso(found.awardedAtMs) }
}

describe('Given the medal catalog', () => {
  describe('When it is read', () => {
    it('Then it should have the 10 medals of D103, 2 of them hidden', () => {
      expect(MEDAL_CATALOG.map(({ code }) => code)).toEqual([
        'first_record',
        'first_window',
        'weekly_goal',
        'week_streak_4',
        'level_10',
        'level_20',
        'volume_up_20',
        'full_period',
        'all_letters_in_week',
        'window_saved_at_end',
      ])
      expect(MEDAL_CATALOG.filter(({ hidden }) => hidden).map(({ code }) => code)).toEqual([
        'all_letters_in_week',
        'window_saved_at_end',
      ])
    })
  })
})

describe('Given a history with no periods', () => {
  describe('When the medals are awarded', () => {
    it('Then it should award none', () => {
      expect(
        awardsOf({
          periods: [],
          sets: [set({ workoutId: 'w1', performedAtMs: at(0), loadG: 50_000 })],
        }),
      ).toEqual([])
    })
  })
})

describe('Given a bench of 50 kg × 10 before period 1', () => {
  const before = set({ workoutId: 'w0', performedAtMs: at(-3), loadG: 50_000 })

  describe('When a set of 52 kg × 10 comes in period 1', () => {
    it('Then it should award the first record at that set', () => {
      const awards = awardsOf({
        sets: [before, set({ workoutId: 'w1', performedAtMs: at(1), loadG: 52_000 })],
      })
      expect(award(awards, 'first_record')).toMatchObject({
        awardedAt: iso(at(1)),
        workoutId: 'w1',
        subject: null,
      })
    })
  })

  describe('When only a set of 50 kg × 10 comes in period 1', () => {
    it('Then it should not award the first record', () => {
      const awards = awardsOf({
        sets: [before, set({ workoutId: 'w1', performedAtMs: at(1), loadG: 50_000 })],
      })
      expect(award(awards, 'first_record')).toBeUndefined()
    })
  })

  describe('When the record came before period 1', () => {
    it('Then it should not award the first record for it', () => {
      const awards = awardsOf({
        sets: [
          set({ workoutId: 'wa', performedAtMs: at(-6), loadG: 40_000 }),
          before,
          set({ workoutId: 'w1', performedAtMs: at(1), loadG: 50_000 }),
        ],
      })
      expect(award(awards, 'first_record')).toBeUndefined()
    })
  })
})

describe('Given chest trained on Monday and again on Wednesday of week 1', () => {
  const sets = [
    set({ workoutId: 'w1', performedAtMs: at(0) }),
    set({ workoutId: 'w2', performedAtMs: at(2) }),
  ]

  describe('When the medals are awarded', () => {
    it('Then it should award the first window at the Wednesday training', () => {
      expect(award(awardsOf({ sets }), 'first_window')).toMatchObject({
        awardedAt: iso(at(2)),
        workoutId: 'w2',
      })
    })

    it('Then it should not award the window saved at the end', () => {
      expect(award(awardsOf({ sets }), 'window_saved_at_end')).toBeUndefined()
    })
  })
})

describe('Given chest trained before period 1 and in the window on the first day of it', () => {
  describe('When the medals are awarded', () => {
    it('Then it should award the first window at the training in the period', () => {
      const awards = awardsOf({
        sets: [
          set({ workoutId: 'w0', performedAtMs: at(-2) }),
          set({ workoutId: 'w1', performedAtMs: at(0) }),
        ],
      })
      expect(award(awards, 'first_window')).toMatchObject({ workoutId: 'w1' })
    })
  })
})

describe('Given chest trained 11 h before its window closes', () => {
  describe('When the medals are awarded', () => {
    it('Then it should award the window saved at the end at that training', () => {
      const saved = at(0) + 120 * HOUR_MS - 11 * HOUR_MS
      const awards = awardsOf({
        sets: [
          set({ workoutId: 'w1', performedAtMs: at(0) }),
          set({ workoutId: 'w2', performedAtMs: saved }),
        ],
      })
      expect(award(awards, 'window_saved_at_end')).toMatchObject({
        awardedAt: iso(saved),
        workoutId: 'w2',
      })
    })
  })
})

describe('Given chest steps to level 10 and later falls to level 8', () => {
  const levelSteps: LevelStep[] = [
    { workoutId: 'w1', performedAtMs: at(3), groupSlug: 'peito', level: 9 },
    { workoutId: 'w2', performedAtMs: at(5), groupSlug: 'peito', level: 10 },
    { workoutId: 'w3', performedAtMs: at(20), groupSlug: 'peito', level: 8 },
  ]

  describe('When the medals are awarded', () => {
    it('Then it should keep the level 10 medal for chest from the set that reached it', () => {
      expect(award(awardsOf({ levelSteps }), 'level_10')).toMatchObject({
        awardedAt: iso(at(5)),
        workoutId: 'w2',
        subject: 'peito',
      })
    })

    it('Then it should not award the level 20 medal', () => {
      expect(award(awardsOf({ levelSteps }), 'level_20')).toBeUndefined()
    })
  })
})

describe('Given back already at level 12 before period 1', () => {
  describe('When back has a set in period 1 that keeps it at 12', () => {
    it('Then it should award the level 10 medal at that set', () => {
      const awards = awardsOf({
        levelSteps: [
          { workoutId: 'w0', performedAtMs: at(-2), groupSlug: 'costas', level: 12 },
          { workoutId: 'w1', performedAtMs: at(1), groupSlug: 'costas', level: 12 },
        ],
      })
      expect(award(awards, 'level_10')).toMatchObject({ workoutId: 'w1', subject: 'costas' })
    })
  })
})

// Each group trained on Monday and in the window on Wednesday: one window used on Wednesday.
const usedOnWednesday = (groups: string[], week: number) =>
  groups.flatMap((slug) => [
    set({ workoutId: `${slug}-${week}-a`, performedAtMs: at(week * 7), primaryGroupSlugs: [slug] }),
    set({
      workoutId: `${slug}-${week}-b`,
      performedAtMs: at(week * 7 + 2, 10 + groups.indexOf(slug)),
      primaryGroupSlugs: [slug],
    }),
  ])

describe('Given a weekly goal of 2 windows and 2 windows used in week 2', () => {
  const sets = usedOnWednesday(['peito', 'costas'], 1)
  const weeks = weeksOf(12, { weeklyGoal: 2 })

  describe('When the medals are awarded', () => {
    it('Then it should award the weekly goal at the window that reached it', () => {
      expect(award(awardsOf({ sets, weeks }), 'weekly_goal')).toMatchObject({
        awardedAt: iso(at(9, 11)),
        workoutId: 'costas-1-b',
      })
    })
  })

  describe('When the week has no weekly goal', () => {
    it('Then it should not award the weekly goal', () => {
      expect(award(awardsOf({ sets }), 'weekly_goal')).toBeUndefined()
    })
  })
})

describe('Given a weekly goal of 1 window met in weeks 1 to 4', () => {
  const sets = [0, 1, 2, 3].flatMap((week) => usedOnWednesday(['peito'], week))

  describe('When the streak reaches 4 in week 4', () => {
    it('Then it should award the 4 weeks streak at the window that met week 4', () => {
      const weeks = weeksOf(12, { weeklyGoal: 1 }).map((week, index) => ({
        ...week,
        weekStreak: index + 1,
      }))
      expect(award(awardsOf({ sets, weeks }), 'week_streak_4')).toMatchObject({
        awardedAt: iso(at(23)),
        workoutId: 'peito-3-b',
      })
    })
  })

  describe('When the streak is only 3 in week 4', () => {
    it('Then it should not award the 4 weeks streak', () => {
      const weeks = weeksOf(12, { weeklyGoal: 1 }).map((week, index) => ({
        ...week,
        weekStreak: Math.min(index + 1, 3),
      }))
      expect(award(awardsOf({ sets, weeks }), 'week_streak_4')).toBeUndefined()
    })
  })
})

describe('Given 1,000 kg of volume in week 1 of the period', () => {
  const week1 = set({ workoutId: 'w1', performedAtMs: at(0), loadG: 100_000, reps: 10 })

  describe('When week 2 reaches 1,200 kg at its second set', () => {
    it('Then it should award the volume medal at that set', () => {
      const awards = awardsOf({
        sets: [
          week1,
          set({ workoutId: 'w2', performedAtMs: at(7), loadG: 100_000, reps: 10 }),
          set({ workoutId: 'w2', performedAtMs: at(7, 11), loadG: 20_000, reps: 10 }),
        ],
      })
      expect(award(awards, 'volume_up_20')).toMatchObject({
        awardedAt: iso(at(7, 11)),
        workoutId: 'w2',
      })
    })
  })

  describe('When week 2 stays at 1,190 kg', () => {
    it('Then it should not award the volume medal', () => {
      const awards = awardsOf({
        sets: [week1, set({ workoutId: 'w2', performedAtMs: at(7), loadG: 119_000, reps: 10 })],
      })
      expect(award(awards, 'volume_up_20')).toBeUndefined()
    })
  })

  describe('When week 2 has 1,200 kg only with a secondary group, which counts half', () => {
    it('Then it should not award the volume medal', () => {
      const awards = awardsOf({
        sets: [
          week1,
          set({
            workoutId: 'w2',
            performedAtMs: at(7),
            loadG: 120_000,
            reps: 10,
            primaryGroupSlugs: [],
            secondaryGroupSlugs: ['triceps'],
          }),
        ],
      })
      expect(award(awards, 'volume_up_20')).toBeUndefined()
    })
  })
})

describe('Given no volume in week 1 of the period', () => {
  describe('When week 2 has volume', () => {
    it('Then it should not award the volume medal', () => {
      const awards = awardsOf({
        sets: [set({ workoutId: 'w2', performedAtMs: at(7), loadG: 100_000 })],
      })
      expect(award(awards, 'volume_up_20')).toBeUndefined()
    })
  })
})

describe('Given a workout on Tuesday of each of the 12 weeks of period 1', () => {
  const sets = Array.from({ length: 12 }, (_, week) =>
    set({ workoutId: `w${week}`, performedAtMs: at(week * 7 + 1) }),
  )

  describe('When the medals are awarded', () => {
    it('Then it should award the full period at the workout of week 12', () => {
      expect(award(awardsOf({ sets }), 'full_period')).toMatchObject({
        awardedAt: iso(at(78)),
        workoutId: 'w11',
      })
    })
  })

  describe('When week 6 has no workout', () => {
    it('Then it should not award the full period', () => {
      const awards = awardsOf({ sets: sets.filter((item) => item.workoutId !== 'w5') })
      expect(award(awards, 'full_period')).toBeUndefined()
    })
  })
})

describe('Given an active program with the letters A, B and C', () => {
  const activeProgram = { id: 'p1', letters: ['A', 'B', 'C'] }

  describe('When A, B and C are trained in week 2', () => {
    it('Then it should award all the letters in the week at the workout of the last letter', () => {
      const awards = awardsOf({
        activeProgram,
        sets: [
          set({ workoutId: 'a', performedAtMs: at(7), letter: 'A' }),
          set({ workoutId: 'b', performedAtMs: at(9), letter: 'B' }),
          set({ workoutId: 'c', performedAtMs: at(11), letter: 'C' }),
        ],
      })
      expect(award(awards, 'all_letters_in_week')).toMatchObject({
        awardedAt: iso(at(11)),
        workoutId: 'c',
      })
    })
  })

  describe('When C falls in the next week', () => {
    it('Then it should not award all the letters in the week', () => {
      const awards = awardsOf({
        activeProgram,
        sets: [
          set({ workoutId: 'a', performedAtMs: at(7), letter: 'A' }),
          set({ workoutId: 'b', performedAtMs: at(9), letter: 'B' }),
          set({ workoutId: 'c', performedAtMs: at(14), letter: 'C' }),
        ],
      })
      expect(award(awards, 'all_letters_in_week')).toBeUndefined()
    })
  })

  describe('When A came from another program', () => {
    it('Then it should not award all the letters in the week', () => {
      const sets = [
        set({ workoutId: 'a', performedAtMs: at(7), letter: 'A' }),
        set({ workoutId: 'b', performedAtMs: at(9), letter: 'B' }),
        set({ workoutId: 'c', performedAtMs: at(11), letter: 'C' }),
      ]
      const workouts = workoutsOf(sets).map((workout) =>
        workout.id === 'a' ? { ...workout, programId: 'p0' } : workout,
      )
      expect(
        award(awardsOf({ activeProgram, sets, workouts }), 'all_letters_in_week'),
      ).toBeUndefined()
    })
  })
})

describe('Given a record and a window used in the same history', () => {
  describe('When the medals are awarded', () => {
    it('Then it should list each medal once, in the order of the awards', () => {
      const awards = awardsOf({
        sets: [
          set({ workoutId: 'w0', performedAtMs: at(0), loadG: 50_000 }),
          set({ workoutId: 'w1', performedAtMs: at(2), loadG: 50_000 }),
          set({ workoutId: 'w2', performedAtMs: at(3), loadG: 55_000 }),
          set({ workoutId: 'w3', performedAtMs: at(4), loadG: 60_000 }),
        ],
        nowMs: at(5),
      })
      expect(awards.map(({ code }) => code)).toEqual(['first_window', 'first_record'])
    })
  })
})
