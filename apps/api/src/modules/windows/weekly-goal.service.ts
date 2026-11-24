import type { Database } from '../../db/connection.js'
import { createId } from '../../db/id.js'
import { DomainError } from '../../errors/domain-error.js'
import { insertWeeklyGoal } from './weekly-goal.repository.js'
import type { WeeklyGoal, WeeklyGoalInput } from './windows.schemas.js'

// 11 muscle groups with one window a day each (D75).
const MAX_WEEKLY_GOAL = 77

export function setWeeklyGoal(db: Database, input: WeeklyGoalInput, now: Date): WeeklyGoal {
  const { weeklyGoal } = input
  if (
    weeklyGoal === undefined ||
    !Number.isInteger(weeklyGoal) ||
    weeklyGoal < 1 ||
    weeklyGoal > MAX_WEEKLY_GOAL
  ) {
    throw new DomainError(
      'weekly_goal_invalid',
      'a meta semanal deve ser um número inteiro de 1 a 77',
      'invalid',
    )
  }
  const definedAt = now.toISOString()
  insertWeeklyGoal(db, { id: createId(now.getTime()), windows: weeklyGoal, definedAt })
  return { weeklyGoal, definedAt }
}
