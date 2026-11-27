export type WindowsTally = {
  windowsUsed: number
  windowsMissed: number
  usedPercent: number | null
}

export type PeriodGroup = WindowsTally & { muscleGroup: { slug: string; name: string } }

export type WeekStatus = 'met' | 'missed' | 'protected' | 'neutral' | 'pending'

export type PeriodWeek = {
  week: number
  from: string
  to: string
  weeklyGoal: number | null
  windowsUsed: number
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
}
