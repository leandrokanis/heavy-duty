import type { Tier } from '@/features/workout/levels.types'

export type WindowsTally = {
  windowsUsed: number
  windowsMissed: number
  usedPercent: number | null
}

// A workout of the period in the personal ranking (D105).
export type RankedWorkout = {
  workoutId: string
  letter: string
  startedAt: string
  points: number
  position: number
}

export type PeriodGroup = WindowsTally & { muscleGroup: { slug: string; name: string } }

export type WeekStatus = 'met' | 'missed' | 'protected' | 'neutral' | 'pending'

export type PeriodWeek = {
  week: number
  from: string
  to: string
  weeklyGoal: number | null
  windowsUsed: number
  // The points of the workouts that started in the week (D102); absent in a copy saved before.
  points?: number
  status: WeekStatus
}

export type WeekStreak = { weeks: number; protectionUsed: boolean }

// The answer of GET /api/periods/current (contratos.md).
export type CurrentPeriod = {
  now: string
  number: number
  startsAt: string
  endsAt: string
  week: number
  weekCount: number
  intention: string | null
  windows: WindowsTally & { targetPercent: number }
  volume: {
    baselineVolumeG: number | null
    lastWeekVolumeG: number | null
    changePercent: number | null
    targetPercent: number
  }
  groups: PeriodGroup[]
  weeks: PeriodWeek[]
  weekStreak: WeekStreak
  // Absent in a copy saved on the device before US-F19-02.
  ranking?: RankedWorkout[]
}

// The snapshot of an ended period, frozen once at its end (US-F11-02, D99).
export type GroupSnapshot = WindowsTally & {
  muscleGroup: { slug: string; name: string }
  level: number
  points: number
  bestLevel: number
  tier: Tier
  windowState: 'resting' | 'open' | 'cooling' | 'none'
}

export type PeriodSnapshot = WindowsTally & {
  points: number
  bestWorkoutPoints: number
  weekStreak: number
  groups: GroupSnapshot[]
}

export type PeriodListItem = {
  number: number
  startsAt: string
  endsAt: string
  intention: string | null
  frozenAt: string | null
  snapshot: PeriodSnapshot | null
}

// The answer of GET /api/periods (contratos.md), from the most recent period.
export type PeriodList = { now: string; periods: PeriodListItem[] }
