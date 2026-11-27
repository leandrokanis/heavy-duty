import type { GroupSnapshot, PeriodListItem } from './period.types'

const GROUPS = [
  ['chest', 'peito'],
  ['back', 'costas'],
] as const

export function groupSnapshot(slug: string, overrides: Partial<GroupSnapshot> = {}): GroupSnapshot {
  const name = GROUPS.find(([listed]) => listed === slug)?.[1] ?? slug
  return {
    muscleGroup: { slug, name },
    level: 1,
    points: 0,
    bestLevel: 1,
    tier: 'bronze',
    windowState: 'none',
    windowsUsed: 0,
    windowsMissed: 0,
    usedPercent: null,
    ...overrides,
  }
}

// Period 1, ended on 2027-02-15 and frozen at once.
export function frozenPeriod(overrides: Partial<PeriodListItem> = {}): PeriodListItem {
  return {
    number: 1,
    startsAt: '2026-11-23T03:00:00.000Z',
    endsAt: '2027-02-15T03:00:00.000Z',
    intention: 'Treinar três vezes por semana até o fim do ano.',
    frozenAt: '2027-02-15T03:00:41.000Z',
    snapshot: {
      windowsUsed: 54,
      windowsMissed: 21,
      usedPercent: 72,
      points: 3120,
      bestWorkoutPoints: 240,
      weekStreak: 5,
      groups: [
        groupSnapshot('chest', {
          level: 12,
          points: 31,
          bestLevel: 13,
          tier: 'gold',
          windowState: 'open',
        }),
        groupSnapshot('back', { level: 6, tier: 'silver', windowState: 'cooling' }),
      ],
    },
    ...overrides,
  }
}
