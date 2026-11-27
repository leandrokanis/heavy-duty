import type { CurrentPeriod } from './period.types'

const GROUPS = [
  ['chest', 'peito'],
  ['back', 'costas'],
  ['lower-back', 'lombar'],
  ['shoulders', 'ombros'],
  ['biceps', 'bíceps'],
  ['triceps', 'tríceps'],
  ['abs', 'abdômen'],
  ['quadriceps', 'quadríceps'],
  ['hamstrings', 'posteriores de coxa'],
  ['glutes', 'glúteos'],
  ['calves', 'panturrilhas'],
] as const

// Period 1 from Monday 2026-11-23 at 00:00 in São Paulo, read on Wednesday of week 2.
export function testPeriod(overrides: Partial<CurrentPeriod> = {}): CurrentPeriod {
  return {
    now: '2026-12-02T15:00:00.000Z',
    number: 1,
    startsAt: '2026-11-23T03:00:00.000Z',
    endsAt: '2027-02-15T03:00:00.000Z',
    week: 2,
    weekCount: 12,
    intention: null,
    windows: { windowsUsed: 17, windowsMissed: 8, usedPercent: 68, targetPercent: 70 },
    volume: {
      baselineVolumeG: 10_000_000,
      lastWeekVolumeG: 11_200_000,
      changePercent: 12,
      targetPercent: 20,
    },
    groups: GROUPS.map(([slug, name]) => ({
      muscleGroup: { slug, name },
      windowsUsed: 0,
      windowsMissed: 0,
      usedPercent: null,
    })),
    weeks: [
      {
        week: 1,
        from: '2026-11-23T03:00:00.000Z',
        to: '2026-11-30T03:00:00.000Z',
        weeklyGoal: 2,
        windowsUsed: 3,
        status: 'met',
      },
      {
        week: 2,
        from: '2026-11-30T03:00:00.000Z',
        to: '2026-12-07T03:00:00.000Z',
        weeklyGoal: 2,
        windowsUsed: 1,
        status: 'pending',
      },
    ],
    weekStreak: { weeks: 1, protectionUsed: false },
    ...overrides,
  }
}
