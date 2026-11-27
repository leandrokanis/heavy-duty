export type StreakWeek = {
  periodNumber: number
  weeklyGoal: number | null
  windowsUsed: number
  // False only for the week of now.
  finished: boolean
}

export type WeekStatus = 'met' | 'missed' | 'protected' | 'neutral' | 'pending'

export type WeekStreak = { weeks: number; protectionUsed: boolean; statuses: WeekStatus[] }

// D101: a week with no goal is neutral; the week of now adds when met and breaks only when it
// ends; the protection spends itself on the first week missed with a streak above 0, once per
// period; the streak crosses the periods. The weeks start at period 1, in time order.
export function weekStreakOf(weeks: readonly StreakWeek[]): WeekStreak {
  let streak = 0
  const protectionUsedIn = new Set<number>()
  const statuses = weeks.map((week): WeekStatus => {
    if (week.weeklyGoal === null) return 'neutral'
    if (week.windowsUsed >= week.weeklyGoal) {
      streak += 1
      return 'met'
    }
    if (!week.finished) return 'pending'
    if (streak > 0 && !protectionUsedIn.has(week.periodNumber)) {
      protectionUsedIn.add(week.periodNumber)
      return 'protected'
    }
    streak = 0
    return 'missed'
  })
  const currentPeriod = weeks.at(-1)?.periodNumber
  return {
    weeks: streak,
    protectionUsed: currentPeriod !== undefined && protectionUsedIn.has(currentPeriod),
    statuses,
  }
}
